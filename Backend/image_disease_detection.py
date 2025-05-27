import os
import sys
import pickle
import numpy as np
import cv2
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Define the CNN model for chest X-ray classification
class ChestXRayNet(nn.Module):
    def __init__(self, num_classes=2):
        super(ChestXRayNet, self).__init__()
        # Convolutional layers
        self.conv1 = nn.Conv2d(3, 32, kernel_size=3, stride=1, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1)
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1)
        
        # Pooling layer
        self.pool = nn.MaxPool2d(kernel_size=2, stride=2, padding=0)
        
        # Fully connected layers
        self.fc1 = nn.Linear(128 * 28 * 28, 512)
        self.fc2 = nn.Linear(512, num_classes)
        
        # Dropout layer to prevent overfitting
        self.dropout = nn.Dropout(0.5)
        
    def forward(self, x):
        # Apply convolutions with ReLU activation and pooling
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = self.pool(F.relu(self.conv3(x)))
        
        # Flatten the output for the fully connected layers
        x = x.view(-1, 128 * 28 * 28)
        
        # Apply fully connected layers with dropout
        x = self.dropout(F.relu(self.fc1(x)))
        x = self.fc2(x)
        
        return x

class DiseaseDetector:
    def __init__(self):
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        
        # Load pre-trained models
        self.models = {}
        self.load_models()
        
        # Define image transformations
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    def load_models(self):
        """Load pre-trained models from PKL files"""
        try:
            # Path to dataset directory containing PKL files
            dataset_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dataset')
            
            # Load models from PKL files
            model_files = {
                'breast_cancer': os.path.join(dataset_dir, 'breast_cancer.pkl'),
                'diabetes': os.path.join(dataset_dir, 'diabetes.pkl'),
                'heart': os.path.join(dataset_dir, 'heart.pkl'),
                'kidney': os.path.join(dataset_dir, 'kidney.pkl'),
                'liver': os.path.join(dataset_dir, 'liver.pkl')
            }
            
            for disease, model_path in model_files.items():
                if os.path.exists(model_path):
                    with open(model_path, 'rb') as f:
                        self.models[disease] = pickle.load(f)
                    logger.info(f"Loaded model for {disease} detection")
                else:
                    logger.warning(f"Model file for {disease} not found at {model_path}")
            
            # Initialize chest X-ray model
            self.chest_xray_model = ChestXRayNet(num_classes=2)  # Binary classification (normal vs pneumonia)
            self.chest_xray_model.to(self.device)
            self.chest_xray_model.eval()  # Set to evaluation mode
            
            logger.info("All available models loaded successfully")
        
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise
    
    def preprocess_image(self, image_path):
        """Preprocess image for model input"""
        try:
            # Load and preprocess the image
            image = Image.open(image_path).convert('RGB')
            return self.transform(image).unsqueeze(0).to(self.device)
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            raise
    
    def extract_features_from_image(self, image_path):
        """Extract features from medical images for traditional ML models"""
        try:
            # Load image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Could not read image at {image_path}")
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Resize to a standard size
            resized = cv2.resize(gray, (128, 128))
            
            # Extract basic features
            features = []
            
            # Add histogram features
            hist = cv2.calcHist([resized], [0], None, [32], [0, 256])
            hist = cv2.normalize(hist, hist).flatten()
            features.extend(hist)
            
            # Add statistical features
            mean, std = cv2.meanStdDev(resized)
            features.extend([mean[0][0], std[0][0]])
            
            # Add texture features using Haralick texture
            glcm = cv2.GaussianBlur(resized, (5, 5), 0)
            features.append(np.mean(glcm))
            features.append(np.std(glcm))
            
            return np.array(features).reshape(1, -1)
        
        except Exception as e:
            logger.error(f"Error extracting features: {str(e)}")
            raise
    
    def detect_disease_from_image(self, image_path):
        """Detect disease from medical image"""
        try:
            # Check if file exists
            if not os.path.exists(image_path):
                return {"error": f"Image file not found at {image_path}"}
            
            # Get file extension
            _, ext = os.path.splitext(image_path)
            ext = ext.lower()
            
            results = {}
            
            # Process based on image type
            if "x_ray" in image_path.lower() or "xray" in image_path.lower() or "chest" in image_path.lower():
                # For chest X-rays, use the CNN model
                logger.info("Processing chest X-ray image")
                
                # Preprocess image
                img_tensor = self.preprocess_image(image_path)
                
                # Make prediction
                with torch.no_grad():
                    outputs = self.chest_xray_model(img_tensor)
                    probabilities = F.softmax(outputs, dim=1)
                    _, predicted = torch.max(outputs, 1)
                
                # Map prediction to disease
                prediction = "Pneumonia" if predicted.item() == 1 else "Normal"
                confidence = probabilities[0][predicted.item()].item() * 100
                
                results["prediction"] = prediction
                results["confidence"] = f"{confidence:.2f}%"
                results["disease_type"] = "Respiratory"
                
            else:
                # For other medical images, extract features and use traditional ML models
                logger.info("Processing general medical image")
                
                # Extract features
                features = self.extract_features_from_image(image_path)
                
                # Make predictions with available models
                for disease, model in self.models.items():
                    try:
                        # Predict probability
                        if hasattr(model, 'predict_proba'):
                            proba = model.predict_proba(features)[0]
                            prediction = model.predict(features)[0]
                            confidence = proba[prediction] * 100
                            
                            results[disease] = {
                                "prediction": "Positive" if prediction == 1 else "Negative",
                                "confidence": f"{confidence:.2f}%"
                            }
                        else:
                            prediction = model.predict(features)[0]
                            results[disease] = {
                                "prediction": "Positive" if prediction == 1 else "Negative",
                                "confidence": "N/A"
                            }
                    except Exception as e:
                        logger.warning(f"Could not make prediction for {disease}: {str(e)}")
            
            return results
        
        except Exception as e:
            logger.error(f"Error in disease detection: {str(e)}")
            return {"error": str(e)}

# API endpoint for FastAPI integration
def create_disease_detection_api(app):
    from fastapi import FastAPI, UploadFile, File, HTTPException
    from fastapi.responses import JSONResponse
    import shutil
    import uuid
    
    # Initialize disease detector
    detector = DiseaseDetector()
    
    @app.post("/api/detect-disease-from-image")
    async def detect_disease_from_image(file: UploadFile = File(...)):
        try:
            # Create temp directory if it doesn't exist
            temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_uploads")
            os.makedirs(temp_dir, exist_ok=True)
            
            # Save uploaded file
            file_extension = os.path.splitext(file.filename)[1]
            temp_file_path = os.path.join(temp_dir, f"upload_{uuid.uuid4()}{file_extension}")
            
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Process the image
            results = detector.detect_disease_from_image(temp_file_path)
            
            # Clean up
            os.remove(temp_file_path)
            
            return results
        
        except Exception as e:
            logger.error(f"Error processing uploaded file: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

# Main function for testing
def main():
    if len(sys.argv) < 2:
        print("Usage: python image_disease_detection.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    detector = DiseaseDetector()
    results = detector.detect_disease_from_image(image_path)
    
    print("\nDisease Detection Results:")
    print("=========================")
    
    if "error" in results:
        print(f"Error: {results['error']}")
    elif "prediction" in results:
        print(f"Prediction: {results['prediction']}")
        print(f"Confidence: {results['confidence']}")
        print(f"Disease Type: {results['disease_type']}")
    else:
        for disease, result in results.items():
            print(f"\n{disease.replace('_', ' ').title()}:")
            print(f"  Prediction: {result['prediction']}")
            print(f"  Confidence: {result['confidence']}")
    
    print("\nDisclaimer: This is an AI-based prediction and should not be used as a substitute for professional medical advice.")

if __name__ == "__main__":
    main()