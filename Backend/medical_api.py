from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import numpy as np
import cv2
from transformers import pipeline
import io
import json
from datetime import datetime
import warnings
import random
import uvicorn
from typing import Optional, Dict, List, Any
import base64

warnings.filterwarnings('ignore')

app = FastAPI(title="Medical Image Analysis API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MedicalImageAnalyzer:
    def __init__(self):
        """Initialize the medical image analyzer with multiple pre-trained models."""
        
        # Initialize device
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
        # Initialize multiple specialized models
        self.models = {}
        self.load_models()
        
        # Define disease classes for different imaging types
        self.chest_xray_classes = [
            'Normal', 'Pneumonia', 'COVID-19', 'Tuberculosis', 'Lung Cancer', 
            'Pneumothorax', 'Pleural Effusion', 'Atelectasis', 'Cardiomegaly',
            'Emphysema', 'Fibrosis', 'Nodule', 'Mass', 'Infiltration'
        ]
        
        self.brain_mri_classes = [
            'Normal', 'Brain Tumor', 'Glioma', 'Meningioma', 'Stroke', 
            'Alzheimer\'s Disease', 'Multiple Sclerosis', 'Hemorrhage',
            'Hydrocephalus', 'Atrophy'
        ]
        
        self.bone_xray_classes = [
            'Normal', 'Fracture', 'Arthritis', 'Osteoporosis', 'Dislocation',
            'Osteomyelitis', 'Bone Tumor', 'Joint Degeneration'
        ]
        
        # Image preprocessing transforms
        self.chest_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.Grayscale(num_output_channels=3),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        self.brain_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def load_models(self):
        """Load pre-trained medical imaging models."""
        
        try:
            # For demo purposes, we'll simulate model loading
            # In production, uncomment these lines to load actual models
            
            # self.models['chest_xray'] = pipeline(
            #     "image-classification",
            #     model="nickmccomb/chest-xray-classification",
            #     device=0 if torch.cuda.is_available() else -1
            # )
            
            # For now, we'll use mock models
            self.models['chest_xray'] = 'mock_model'
            self.models['covid_detection'] = 'mock_model'
            self.models['general_medical'] = 'mock_model'
            
            print("Models loaded successfully (mock mode)")
            
        except Exception as e:
            print(f"Warning: Using mock models due to: {e}")
            self.models['chest_xray'] = 'mock_model'
            self.models['covid_detection'] = 'mock_model'
            self.models['general_medical'] = 'mock_model'

    def detect_image_type(self, image):
        """Automatically detect the type of medical image."""
        try:
            # Convert to numpy array for analysis
            img_array = np.array(image)
            
            # Analyze image characteristics
            height, width = img_array.shape[:2]
            aspect_ratio = width / height
            
            # Simple heuristics for image type detection
            if aspect_ratio > 1.2:  # Wider images often chest X-rays
                return 'chest'
            elif aspect_ratio < 0.8:  # Taller images might be limb X-rays
                return 'bone'
            else:  # Square-ish images often brain scans
                return 'brain'
                
        except Exception as e:
            print(f"Error detecting image type: {e}")
            return 'general'

    def generate_mock_predictions(self, image_type):
        """Generate mock predictions for demo purposes."""
        predictions_map = {
            'chest': [
                {'label': 'Normal', 'score': random.uniform(0.7, 0.95)},
                {'label': 'Pneumonia', 'score': random.uniform(0.1, 0.3)},
                {'label': 'COVID-19', 'score': random.uniform(0.05, 0.2)},
                {'label': 'Tuberculosis', 'score': random.uniform(0.02, 0.1)},
                {'label': 'Lung Cancer', 'score': random.uniform(0.01, 0.08)}
            ],
            'brain': [
                {'label': 'Normal', 'score': random.uniform(0.6, 0.9)},
                {'label': 'Brain Tumor', 'score': random.uniform(0.1, 0.4)},
                {'label': 'Stroke', 'score': random.uniform(0.05, 0.2)},
                {'label': 'Hemorrhage', 'score': random.uniform(0.02, 0.15)},
                {'label': 'Atrophy', 'score': random.uniform(0.01, 0.1)}
            ],
            'bone': [
                {'label': 'Normal', 'score': random.uniform(0.65, 0.85)},
                {'label': 'Fracture', 'score': random.uniform(0.1, 0.35)},
                {'label': 'Arthritis', 'score': random.uniform(0.05, 0.2)},
                {'label': 'Osteoporosis', 'score': random.uniform(0.02, 0.1)},
                {'label': 'Dislocation', 'score': random.uniform(0.01, 0.08)}
            ]
        }
        
        return predictions_map.get(image_type, predictions_map['chest'])

    def calculate_risk_assessment(self, predictions):
        """Calculate risk assessment based on predictions."""
        if not predictions:
            return "Unable to assess"
        
        # Get highest confidence prediction
        top_prediction = max(predictions, key=lambda x: x.get('score', 0))
        confidence = top_prediction.get('score', 0)
        label = top_prediction.get('label', '').lower()
        
        # Risk categorization
        if 'normal' in label:
            if confidence > 0.8:
                return "Low Risk - Appears Normal"
            else:
                return "Low-Medium Risk - Likely Normal"
        elif any(severe in label for severe in ['cancer', 'tumor', 'stroke', 'hemorrhage']):
            if confidence > 0.7:
                return "High Risk - Requires Immediate Attention"
            else:
                return "Medium-High Risk - Needs Further Evaluation"
        elif any(moderate in label for moderate in ['pneumonia', 'fracture', 'infection']):
            if confidence > 0.6:
                return "Medium Risk - Medical Attention Recommended"
            else:
                return "Low-Medium Risk - Monitor Closely"
        else:
            return "Medium Risk - Further Analysis Needed"

    def generate_recommendations(self, predictions, image_type):
        """Generate medical recommendations based on findings."""
        if not predictions:
            return ["Consult with a radiologist for proper image interpretation."]
        
        recommendations = []
        top_prediction = max(predictions, key=lambda x: x.get('score', 0))
        label = top_prediction.get('label', '').lower()
        confidence = top_prediction.get('score', 0)
        
        # General recommendations
        recommendations.append("This AI analysis is for screening purposes only and should not replace professional medical diagnosis.")
        
        # Specific recommendations based on findings
        if 'normal' in label and confidence > 0.8:
            recommendations.append("Image appears normal, but regular check-ups are still recommended.")
        elif 'pneumonia' in label:
            recommendations.append("Possible pneumonia detected. Seek immediate medical attention.")
        elif 'covid' in label:
            recommendations.append("Possible COVID-19 pneumonia. Isolate and get tested immediately.")
        elif 'tumor' in label or 'cancer' in label:
            recommendations.append("Suspicious mass detected. Urgent oncology consultation recommended.")
        elif 'fracture' in label:
            recommendations.append("Possible fracture detected. Orthopedic evaluation needed.")
        elif 'stroke' in label:
            recommendations.append("Signs suggestive of stroke. Emergency medical attention required.")
        
        # Follow-up recommendations
        recommendations.append("Schedule follow-up with appropriate specialist.")
        
        return recommendations

    def analyze_image(self, image: Image.Image):
        """Main function to analyze medical images."""
        try:
            # Detect image type
            image_type = self.detect_image_type(image)
            
            # Generate mock predictions (in production, use actual model inference)
            predictions = self.generate_mock_predictions(image_type)
            
            # Sort by confidence
            predictions.sort(key=lambda x: x.get('score', 0), reverse=True)
            
            # Calculate risk assessment
            risk_assessment = self.calculate_risk_assessment(predictions)
            
            # Generate recommendations
            recommendations = self.generate_recommendations(predictions, image_type)
            
            return {
                'image_type': image_type,
                'predictions': predictions,
                'risk_assessment': risk_assessment,
                'recommendations': recommendations,
                'confidence_summary': {
                    'highest_confidence': max([p.get('score', 0) for p in predictions]) if predictions else 0,
                    'average_confidence': np.mean([p.get('score', 0) for p in predictions]) if predictions else 0,
                    'total_predictions': len(predictions)
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"error": f"Analysis failed: {str(e)}"}

# Initialize the analyzer
analyzer = MedicalImageAnalyzer()

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Medical Image Analysis API", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "device": str(analyzer.device),
        "models_loaded": len(analyzer.models),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/analyze")
async def analyze_medical_image(file: UploadFile = File(...)):
    """
    Analyze a medical image.
    
    Args:
        file: Medical image file (JPG, PNG, etc.)
    
    Returns:
        Analysis results including predictions, risk assessment, and recommendations
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Analyze the image
        results = analyzer.analyze_image(image)
        
        if 'error' in results:
            raise HTTPException(status_code=500, detail=results['error'])
        
        return JSONResponse(content=results)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/analyze-base64")
async def analyze_base64_image(data: dict):
    """
    Analyze a medical image from base64 data.
    
    Args:
        data: Dictionary containing base64 encoded image
    
    Returns:
        Analysis results including predictions, risk assessment, and recommendations
    """
    try:
        # Get base64 data
        base64_data = data.get('image')
        if not base64_data:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Remove data URL prefix if present
        if base64_data.startswith('data:image'):
            base64_data = base64_data.split(',')[1]
        
        # Decode base64 image
        image_data = base64.b64decode(base64_data)
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Analyze the image
        results = analyzer.analyze_image(image)
        
        if 'error' in results:
            raise HTTPException(status_code=500, detail=results['error'])
        
        return JSONResponse(content=results)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/supported-types")
async def get_supported_types():
    """Get supported medical image types."""
    return {
        "supported_types": ["chest", "brain", "bone", "general"],
        "chest_conditions": analyzer.chest_xray_classes,
        "brain_conditions": analyzer.brain_mri_classes,
        "bone_conditions": analyzer.bone_xray_classes
    }

if __name__ == "__main__":
    print("Starting Medical Image Analysis Server...")
    print("Server will be available at: http://localhost:8003")
    print("API documentation at: http://localhost:8003/docs")
    
    uvicorn.run(
        "__main__:app",  # Use import string format for reload to work
        host="0.0.0.0",
        port=8003,
        reload=True
    )