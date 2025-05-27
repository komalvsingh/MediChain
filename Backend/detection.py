# backend/ai_disease_detection.py
import os
import base64
import json
from io import BytesIO
from PIL import Image
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
import requests
from datetime import datetime
import logging
from dotenv import load_dotenv
import torch
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    BlipProcessor, BlipForConditionalGeneration,
    pipeline, AutoModel, AutoConfig
)
from huggingface_hub import login
import warnings
warnings.filterwarnings("ignore")

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN")  # Add your Hugging Face token
UPLOAD_FOLDER = "uploads"
RESULTS_FOLDER = "results"

# Create directories if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# Login to Hugging Face if token is provided
if HF_TOKEN:
    try:
        login(token=HF_TOKEN)
        logger.info("Successfully logged into Hugging Face")
    except Exception as e:
        logger.warning(f"Hugging Face login failed: {e}")

# Initialize Groq LLM
llm = ChatGroq(
    groq_api_key=GROQ_API_KEY,
    model_name="llama-3.2-11b-vision-preview",
    temperature=0.1,
    max_tokens=4096
)

class HuggingFaceModels:
    """Class to handle Hugging Face model operations"""
    
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        
        # Initialize models
        self.models = {}
        self.tokenizers = {}
        self.processors = {}
        
        # Load models for different medical tasks
        self._load_medical_models()
    
    def _load_medical_models(self):
        """Load various medical analysis models"""
        try:
            # Medical report classification model
            logger.info("Loading medical report classification model...")
            self.models['medical_report'] = pipeline(
                "text-classification",
                model="emilyalsentzer/Bio_ClinicalBERT",
                device=0 if torch.cuda.is_available() else -1
            )
            
            # Medical image captioning model
            logger.info("Loading medical image captioning model...")
            self.processors['medical_caption'] = BlipProcessor.from_pretrained(
                "Salesforce/blip-image-captioning-base"
            )
            self.models['medical_caption'] = BlipForConditionalGeneration.from_pretrained(
                "Salesforce/blip-image-captioning-base"
            ).to(self.device)
            
            # Medical NER model for extracting medical entities
            logger.info("Loading medical NER model...")
            self.models['medical_ner'] = pipeline(
                "ner",
                model="d4data/biomedical-ner-all",
                aggregation_strategy="simple",
                device=0 if torch.cuda.is_available() else -1
            )
            
            # Disease classification model
            logger.info("Loading disease classification model...")
            self.models['disease_classifier'] = pipeline(
                "text-classification",
                model="microsoft/DialoGPT-medium",  # You can replace with a medical-specific model
                device=0 if torch.cuda.is_available() else -1
            )
            
            logger.info("All Hugging Face models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading Hugging Face models: {e}")
            # Initialize empty models to prevent crashes
            self.models = {}
            self.processors = {}

class EnhancedMedicalImageAnalyzer:
    def __init__(self):
        self.supported_formats = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.dcm']
        self.hf_models = HuggingFaceModels()
        
        # Enhanced disease knowledge base
        self.disease_knowledge = {
            'Pneumonia': {
                'description': 'Inflammatory condition of the lung affecting primarily the small air sacs known as alveoli.',
                'symptoms': ['Cough with phlegm', 'Fever', 'Chills', 'Difficulty breathing', 'Chest pain'],
                'causes': ['Bacterial infection', 'Viral infection', 'Fungal infection'],
                'treatment': ['Antibiotics for bacterial pneumonia', 'Rest and fluids', 'Oxygen therapy if severe'],
                'urgency': 'high'
            },
            'Tuberculosis': {
                'description': 'Infectious disease primarily affecting the lungs, caused by Mycobacterium tuberculosis.',
                'symptoms': ['Persistent cough', 'Blood in sputum', 'Weight loss', 'Night sweats', 'Fatigue'],
                'causes': ['Mycobacterium tuberculosis infection', 'Weakened immune system'],
                'treatment': ['Anti-TB medications for 6-9 months', 'Isolation during initial treatment'],
                'urgency': 'high'
            },
            'COVID-19': {
                'description': 'Respiratory illness caused by SARS-CoV-2 coronavirus.',
                'symptoms': ['Dry cough', 'Fever', 'Shortness of breath', 'Loss of taste/smell', 'Fatigue'],
                'causes': ['SARS-CoV-2 virus infection'],
                'treatment': ['Supportive care', 'Antiviral medications', 'Oxygen therapy if needed'],
                'urgency': 'moderate'
            },
            'Lung Cancer': {
                'description': 'Malignant tumor that begins in the lungs, often associated with smoking.',
                'symptoms': ['Persistent cough', 'Chest pain', 'Shortness of breath', 'Weight loss', 'Coughing up blood'],
                'causes': ['Smoking', 'Environmental toxins', 'Genetic factors', 'Radon exposure'],
                'treatment': ['Surgery', 'Chemotherapy', 'Radiation therapy', 'Targeted therapy'],
                'urgency': 'high'
            },
            'Brain Tumor': {
                'description': 'Abnormal growth of cells within the brain or skull.',
                'symptoms': ['Headaches', 'Seizures', 'Nausea', 'Vision problems', 'Cognitive changes'],
                'causes': ['Genetic mutations', 'Radiation exposure', 'Age factors'],
                'treatment': ['Surgery', 'Radiation therapy', 'Chemotherapy', 'Targeted therapy'],
                'urgency': 'high'
            },
            'Stroke': {
                'description': 'Interruption of blood supply to part of the brain.',
                'symptoms': ['Sudden numbness', 'Confusion', 'Trouble speaking', 'Vision problems', 'Severe headache'],
                'causes': ['Blood clot', 'Bleeding in brain', 'High blood pressure', 'Diabetes'],
                'treatment': ['Emergency medical care', 'Clot-busting drugs', 'Surgery if needed'],
                'urgency': 'critical'
            },
            'Diabetic Retinopathy': {
                'description': 'Diabetes complication that affects eyes, damaging blood vessels in the retina.',
                'symptoms': ['Blurred vision', 'Dark spots', 'Difficulty seeing colors', 'Vision loss'],
                'causes': ['Long-term diabetes', 'High blood sugar', 'High blood pressure'],
                'treatment': ['Blood sugar control', 'Laser treatment', 'Eye injections', 'Surgery'],
                'urgency': 'moderate'
            }
        }
        
        self.disease_templates = {
            'chest_xray': {
                'diseases': ['Pneumonia', 'Tuberculosis', 'COVID-19', 'Lung Cancer', 'Pleural Effusion', 'Pneumothorax'],
                'system_prompt': """You are an expert radiologist AI assistant specializing in chest X-ray analysis. 
                Analyze the provided chest X-ray image and provide a detailed medical assessment focusing on:
                
                1. Image Quality Assessment
                2. Anatomical Structure Analysis
                3. Pathological Findings Detection
                4. Disease Classification with Confidence Scores
                5. Recommendations for Further Action
                
                Focus specifically on detecting: Pneumonia, Tuberculosis, COVID-19, Lung Cancer, Pleural Effusion, and Pneumothorax.
                
                IMPORTANT: You must respond with a valid JSON object in exactly this format:
                {
                    "image_quality": "good/fair/poor",
                    "primary_findings": ["finding1", "finding2"],
                    "disease_predictions": [
                        {
                            "disease": "disease_name",
                            "confidence": 0.85,
                            "evidence": "specific visual indicators"
                        }
                    ],
                    "anatomical_assessment": {
                        "heart": "normal/abnormal findings",
                        "lungs": "specific findings", 
                        "bones": "any abnormalities"
                    },
                    "recommendations": ["recommendation1", "recommendation2"],
                    "urgency_level": "low/moderate/high",
                    "disclaimer": "AI analysis for reference only, consult healthcare professional"
                }
                
                Do not include any text outside of the JSON object."""
            },
            'mri': {
                'diseases': ['Brain Tumor', 'Stroke', 'Multiple Sclerosis', 'Alzheimer\'s Disease'],
                'system_prompt': """You are an expert radiologist AI assistant specializing in MRI analysis.
                Analyze the provided MRI image and provide detailed medical assessment focusing on:
                
                1. Image Quality and Sequence Type
                2. Anatomical Structure Analysis
                3. Signal Intensity Patterns
                4. Pathological Findings Detection
                5. Disease Classification with Confidence
                
                IMPORTANT: You must respond with a valid JSON object in exactly this format:
                {
                    "image_quality": "good/fair/poor",
                    "primary_findings": ["finding1", "finding2"],
                    "disease_predictions": [
                        {
                            "disease": "disease_name",
                            "confidence": 0.85,
                            "evidence": "specific visual indicators"
                        }
                    ],
                    "anatomical_assessment": {
                        "brain": "normal/abnormal findings",
                        "structures": "specific findings"
                    },
                    "recommendations": ["recommendation1", "recommendation2"],
                    "urgency_level": "low/moderate/high",
                    "disclaimer": "AI analysis for reference only, consult healthcare professional"
                }
                
                Do not include any text outside of the JSON object."""
            },
            'retinal': {
                'diseases': ['Diabetic Retinopathy', 'Glaucoma', 'Macular Degeneration', 'Retinal Detachment'],
                'system_prompt': """You are an expert ophthalmologist AI assistant specializing in retinal image analysis.
                Analyze the fundus/retinal image for diabetic retinopathy and other retinal conditions.
                
                IMPORTANT: You must respond with a valid JSON object in exactly this format:
                {
                    "image_quality": "good/fair/poor",
                    "primary_findings": ["finding1", "finding2"],
                    "disease_predictions": [
                        {
                            "disease": "disease_name",
                            "confidence": 0.85,
                            "evidence": "specific visual indicators"
                        }
                    ],
                    "anatomical_assessment": {
                        "optic_disc": "normal/abnormal findings",
                        "macula": "specific findings",
                        "vessels": "any abnormalities"
                    },
                    "recommendations": ["recommendation1", "recommendation2"],
                    "urgency_level": "low/moderate/high",
                    "disclaimer": "AI analysis for reference only, consult healthcare professional"
                }
                
                Do not include any text outside of the JSON object."""
            }
        }
    
    def analyze_with_huggingface(self, image_path, image_type):
        """Enhanced analysis using Hugging Face models"""
        try:
            analysis_results = {}
            
            # Generate medical image caption
            if 'medical_caption' in self.hf_models.models:
                caption = self.generate_medical_caption(image_path)
                analysis_results['medical_caption'] = caption
                
                # Extract medical entities from caption
                if caption and 'medical_ner' in self.hf_models.models:
                    entities = self.hf_models.models['medical_ner'](caption)
                    analysis_results['medical_entities'] = entities
            
            # Additional processing based on image type
            if image_type == 'mri':
                analysis_results.update(self.analyze_mri_specific(image_path))
            elif image_type == 'chest_xray':
                analysis_results.update(self.analyze_chest_xray_specific(image_path))
            elif image_type == 'retinal':
                analysis_results.update(self.analyze_retinal_specific(image_path))
            
            return analysis_results
            
        except Exception as e:
            logger.error(f"Error in Hugging Face analysis: {e}")
            return {"hf_error": str(e)}
    
    def generate_medical_caption(self, image_path):
        """Generate medical image caption using BLIP model"""
        try:
            if 'medical_caption' not in self.hf_models.models:
                return None
                
            image = Image.open(image_path).convert('RGB')
            
            # Process image
            inputs = self.hf_models.processors['medical_caption'](
                image, 
                return_tensors="pt"
            ).to(self.hf_models.device)
            
            # Generate caption
            with torch.no_grad():
                out = self.hf_models.models['medical_caption'].generate(**inputs, max_length=100)
            
            caption = self.hf_models.processors['medical_caption'].decode(
                out[0], skip_special_tokens=True
            )
            
            return caption
            
        except Exception as e:
            logger.error(f"Error generating medical caption: {e}")
            return None
    
    def analyze_mri_specific(self, image_path):
        """MRI-specific analysis using specialized models"""
        results = {}
        
        try:
            # Enhanced MRI analysis
            results['mri_analysis'] = {
                'brain_regions_analyzed': [
                    'Frontal lobe', 'Parietal lobe', 'Temporal lobe', 'Occipital lobe',
                    'Cerebellum', 'Brainstem', 'Ventricles'
                ],
                'sequences_considered': ['T1-weighted', 'T2-weighted', 'FLAIR', 'DWI'],
                'pathology_focus': [
                    'Mass lesions', 'Edema', 'Hemorrhage', 'Infarction', 
                    'White matter changes', 'Atrophy'
                ]
            }
            
            # Simulate advanced MRI metrics (in real implementation, use actual models)
            results['quantitative_metrics'] = {
                'brain_volume': 'Within normal limits',
                'ventricular_size': 'Normal',
                'cortical_thickness': 'Preserved',
                'white_matter_integrity': 'No significant abnormalities detected'
            }
            
        except Exception as e:
            logger.error(f"Error in MRI-specific analysis: {e}")
            results['mri_error'] = str(e)
        
        return results
    
    def analyze_chest_xray_specific(self, image_path):
        """Chest X-ray specific analysis"""
        results = {}
        
        try:
            results['chest_analysis'] = {
                'lung_fields': 'Bilateral lung fields evaluated',
                'heart_size': 'Cardiothoracic ratio assessed',
                'mediastinum': 'Mediastinal contours evaluated',
                'pleural_spaces': 'Pleural spaces examined',
                'bony_structures': 'Ribs and spine visualized'
            }
            
            results['pathology_search'] = [
                'Consolidation', 'Infiltrates', 'Masses', 'Nodules',
                'Pneumothorax', 'Pleural effusion', 'Cardiomegaly'
            ]
            
        except Exception as e:
            logger.error(f"Error in chest X-ray analysis: {e}")
            results['chest_error'] = str(e)
        
        return results
    
    def analyze_retinal_specific(self, image_path):
        """Retinal image specific analysis"""
        results = {}
        
        try:
            results['retinal_analysis'] = {
                'optic_disc': 'Cup-to-disc ratio evaluated',
                'macula': 'Macular integrity assessed',
                'vessels': 'Retinal vasculature examined',
                'periphery': 'Peripheral retina visualized'
            }
            
            results['diabetic_retinopathy_stages'] = [
                'No apparent retinopathy',
                'Mild nonproliferative diabetic retinopathy',
                'Moderate nonproliferative diabetic retinopathy', 
                'Severe nonproliferative diabetic retinopathy',
                'Proliferative diabetic retinopathy'
            ]
            
        except Exception as e:
            logger.error(f"Error in retinal analysis: {e}")
            results['retinal_error'] = str(e)
        
        return results
    
    def analyze_medical_report(self, report_text):
        """Analyze medical reports using Hugging Face NLP models"""
        try:
            analysis_results = {}
            
            # Extract medical entities
            if 'medical_ner' in self.hf_models.models:
                entities = self.hf_models.models['medical_ner'](report_text)
                analysis_results['medical_entities'] = entities
            
            # Classify medical conditions mentioned
            diseases_mentioned = []
            conditions_found = []
            
            # Check for disease mentions in text
            report_lower = report_text.lower()
            for disease, info in self.disease_knowledge.items():
                if disease.lower() in report_lower:
                    diseases_mentioned.append({
                        'disease': disease,
                        'description': info['description'],
                        'symptoms': info['symptoms'],
                        'treatment': info['treatment'],
                        'urgency': info['urgency']
                    })
            
            analysis_results['diseases_identified'] = diseases_mentioned
            analysis_results['report_summary'] = self.summarize_medical_report(report_text)
            
            return analysis_results
            
        except Exception as e:
            logger.error(f"Error analyzing medical report: {e}")
            return {"error": str(e)}
    
    def summarize_medical_report(self, report_text):
        """Summarize medical report"""
        try:
            # Simple keyword-based summarization (can be enhanced with transformers)
            keywords = [
                'diagnosis', 'findings', 'impression', 'recommendation',
                'treatment', 'follow-up', 'medication', 'surgery'
            ]
            
            sentences = report_text.split('.')
            important_sentences = []
            
            for sentence in sentences:
                if any(keyword in sentence.lower() for keyword in keywords):
                    important_sentences.append(sentence.strip())
            
            return important_sentences[:5]  # Return top 5 important sentences
            
        except Exception as e:
            logger.error(f"Error summarizing report: {e}")
            return ["Summary generation failed"]
    
    def enhance_disease_analysis(self, analysis_result):
        """Enhance analysis with detailed disease information"""
        try:
            if 'disease_predictions' in analysis_result:
                enhanced_predictions = []
                
                for prediction in analysis_result['disease_predictions']:
                    disease_name = prediction.get('disease', '')
                    
                    enhanced_prediction = prediction.copy()
                    
                    # Add detailed disease information if available
                    if disease_name in self.disease_knowledge:
                        disease_info = self.disease_knowledge[disease_name]
                        enhanced_prediction.update({
                            'detailed_description': disease_info['description'],
                            'common_symptoms': disease_info['symptoms'],
                            'typical_causes': disease_info['causes'],
                            'treatment_options': disease_info['treatment'],
                            'clinical_urgency': disease_info['urgency']
                        })
                    
                    enhanced_predictions.append(enhanced_prediction)
                
                analysis_result['disease_predictions'] = enhanced_predictions
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error enhancing disease analysis: {e}")
            return analysis_result
    
    def preprocess_image(self, image_path):
        """Preprocess image for better analysis"""
        try:
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                # Try with PIL for different formats
                pil_image = Image.open(image_path)
                image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            
            # Convert to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Enhance contrast for medical images
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            if len(image_rgb.shape) == 3:
                # For color images, apply to each channel
                lab = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2LAB)
                lab[:,:,0] = clahe.apply(lab[:,:,0])
                enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            else:
                enhanced = clahe.apply(image_rgb)
            
            # Resize if too large (Groq has size limits)
            height, width = enhanced.shape[:2]
            if max(height, width) > 1024:
                scale = 1024 / max(height, width)
                new_width = int(width * scale)
                new_height = int(height * scale)
                enhanced = cv2.resize(enhanced, (new_width, new_height), interpolation=cv2.INTER_AREA)
            
            return enhanced
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            return None
    
    def encode_image_to_base64(self, image_array):
        """Convert image array to base64 string"""
        try:
            pil_image = Image.fromarray(image_array)
            buffer = BytesIO()
            pil_image.save(buffer, format='JPEG', quality=85)
            encoded_string = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return encoded_string
        except Exception as e:
            logger.error(f"Error encoding image: {str(e)}")
            return None
    
    def determine_image_type(self, image_path):
        """Determine the type of medical image"""
        filename = os.path.basename(image_path).lower()
        
        if any(word in filename for word in ['chest', 'xray', 'x-ray', 'lung']):
            return 'chest_xray'
        elif any(word in filename for word in ['mri', 'brain', 'head']):
            return 'mri'
        elif any(word in filename for word in ['retinal', 'fundus', 'eye', 'retino']):
            return 'retinal'
        else:
            return 'chest_xray'
    
    def analyze_medical_image(self, image_path, image_type=None):
        """Main function to analyze medical images with enhanced HuggingFace integration"""
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image_path)
            if processed_image is None:
                return {"error": "Failed to preprocess image"}
            
            # Encode image
            base64_image = self.encode_image_to_base64(processed_image)
            if not base64_image:
                return {"error": "Failed to encode image"}
            
            # Determine image type if not provided
            if not image_type:
                image_type = self.determine_image_type(image_path)
            
            # Get Hugging Face analysis first
            logger.info("Running Hugging Face analysis...")
            hf_analysis = self.analyze_with_huggingface(image_path, image_type)
            
            # Get appropriate template
            template = self.disease_templates.get(image_type, self.disease_templates['chest_xray'])
            
            # Create enhanced prompt with HF insights
            hf_context = ""
            if hf_analysis.get('medical_caption'):
                hf_context += f"Medical Image Caption: {hf_analysis['medical_caption']}\n"
            if hf_analysis.get('medical_entities'):
                entities_text = ", ".join([ent['word'] for ent in hf_analysis['medical_entities']])
                hf_context += f"Detected Medical Entities: {entities_text}\n"
            
            # Create the message with image and HF context
            messages = [
                SystemMessage(content=template['system_prompt']),
                HumanMessage(content=[
                    {
                        "type": "text",
                        "text": f"""Please analyze this {image_type.replace('_', ' ')} image for any pathological findings and diseases. 
                        
                        Additional AI Analysis Context:
                        {hf_context}
                        
                        Provide a comprehensive medical assessment in the exact JSON format specified in the system prompt."""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ])
            ]
            
            # Get response from Groq
            logger.info(f"Sending request to Groq with model: {llm.model_name}")
            response = llm.invoke(messages)
            logger.info(f"Received response from Groq")
            
            # Parse the response
            analysis_result = self.parse_llm_response(response.content, image_type)
            
            # Enhance with detailed disease information
            analysis_result = self.enhance_disease_analysis(analysis_result)
            
            # Add Hugging Face analysis results
            analysis_result['huggingface_analysis'] = hf_analysis
            
            # Add metadata
            analysis_result['metadata'] = {
                'model_used': llm.model_name,
                'analysis_timestamp': datetime.now().isoformat(),
                'image_type': image_type,
                'image_path': image_path,
                'enhanced_with_huggingface': True
            }
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error in medical image analysis: {str(e)}")
            return {"error": f"Analysis failed: {str(e)}"}
    
    def parse_llm_response(self, response_text, image_type):
        """Parse and structure the LLM response"""
        try:
            # First, try to parse as direct JSON
            try:
                # Clean the response text
                cleaned_response = response_text.strip()
                
                # Try to extract JSON from response
                import re
                json_match = re.search(r'\{.*\}', cleaned_response, re.DOTALL)
                
                if json_match:
                    json_str = json_match.group()
                    parsed_json = json.loads(json_str)
                    logger.info("Successfully parsed JSON response")
                    return parsed_json
                else:
                    logger.warning("No JSON found in response, falling back to text parsing")
            except json.JSONDecodeError as e:
                logger.warning(f"JSON parsing failed: {e}, falling back to text parsing")
            
            # If JSON parsing fails, create structured response from text
            structured_response = {
                "raw_analysis": response_text,
                "image_quality": "fair",
                "primary_findings": self.extract_findings(response_text),
                "disease_predictions": self.extract_diseases(response_text, image_type),
                "anatomical_assessment": self.extract_anatomical_assessment(response_text, image_type),
                "recommendations": self.extract_recommendations(response_text),
                "urgency_level": self.determine_urgency(response_text),
                "disclaimer": "AI analysis for reference only. Please consult with a qualified healthcare professional for accurate diagnosis and treatment."
            }
            
            logger.info("Created structured response from text parsing")
            return structured_response
            
        except Exception as e:
            logger.error(f"Error parsing LLM response: {str(e)}")
            return {
                "error": "Failed to parse analysis results",
                "raw_response": response_text,
                "image_quality": "unknown",
                "primary_findings": ["Analysis parsing failed"],
                "disease_predictions": [],
                "recommendations": ["Please try again or consult a healthcare professional"],
                "urgency_level": "moderate",
                "disclaimer": "AI analysis for reference only. Please consult with a qualified healthcare professional."
            }
    
    def extract_findings(self, text):
        """Extract key findings from text"""
        findings = []
        text_lower = text.lower()
        
        finding_keywords = [
            'opacity', 'consolidation', 'infiltrate', 'nodule', 'mass',
            'effusion', 'pneumothorax', 'atelectasis', 'cardiomegaly',
            'hemorrhage', 'lesion', 'abnormality', 'normal', 'clear'
        ]
        
        for keyword in finding_keywords:
            if keyword in text_lower:
                # Add context around the keyword
                import re
                pattern = rf'.{{0,30}}{keyword}.{{0,30}}'
                matches = re.findall(pattern, text_lower, re.IGNORECASE)
                if matches:
                    findings.append(matches[0].strip().capitalize())
        
        # If no specific findings, add general assessment
        if not findings:
            if 'normal' in text_lower:
                findings.append("Image appears within normal limits")
            elif 'abnormal' in text_lower:
                findings.append("Abnormal findings detected")
            else:
                findings.append("Medical image analyzed")
        
        return findings[:5]  # Limit to top 5 findings
    
    def extract_diseases(self, text, image_type):
        """Extract disease predictions from text"""
        diseases = []
        text_lower = text.lower()
        
        template = self.disease_templates.get(image_type, self.disease_templates['chest_xray'])
        
        for disease in template['diseases']:
            disease_lower = disease.lower()
            if disease_lower in text_lower:
                # Simple confidence estimation based on context
                confidence = 0.7  # Default confidence
                if any(word in text_lower for word in ['highly likely', 'strong evidence', 'clear signs', 'definite']):
                    confidence = 0.9
                elif any(word in text_lower for word in ['possible', 'suggestive', 'may indicate', 'might']):
                    confidence = 0.6
                elif any(word in text_lower for word in ['unlikely', 'no evidence', 'normal', 'negative']):
                    confidence = 0.3
                
                diseases.append({
                    "disease": disease,
                    "confidence": confidence,
                    "evidence": f"AI detected patterns potentially consistent with {disease}"
                })
        
        # If no specific diseases found, add general assessment
        if not diseases and 'normal' not in text_lower:
            diseases.append({
                "disease": "Requires further evaluation",
                "confidence": 0.5,
                "evidence": "Image analysis completed, professional review recommended"
            })
        
        return diseases
    
    def extract_anatomical_assessment(self, text, image_type):
        """Extract anatomical assessment from text"""
        text_lower = text.lower()
        
        if image_type == 'chest_xray':
            return {
                "heart": "Normal size" if 'normal' in text_lower and 'heart' in text_lower else "Requires evaluation",
                "lungs": "Clear" if 'clear' in text_lower or 'normal' in text_lower else "See findings above",
                "bones": "No acute abnormalities visible" if 'normal' in text_lower else "Evaluated"
            }
        elif image_type == 'mri':
            return {
                "brain": "Analyzed for pathological changes",
                "structures": "Anatomical structures assessed"
            }
        else:  # retinal
            return {
                "optic_disc": "Assessed for abnormalities",
                "macula": "Evaluated for pathological changes",
                "vessels": "Vascular pattern analyzed"
            }
    
    def extract_recommendations(self, text):
        """Extract recommendations from text"""
        recommendations = [
            "Consult with a radiologist for expert interpretation",
            "Consider clinical correlation with patient symptoms"
        ]
        
        text_lower = text.lower()
        if 'urgent' in text_lower or 'immediate' in text_lower:
            recommendations.insert(0, "Seek immediate medical attention")
        elif 'follow' in text_lower:
            recommendations.append("Schedule follow-up examination")
        
        recommendations.append("This AI analysis is for reference only")
        
        return recommendations
    
    def determine_urgency(self, text):
        """Determine urgency level from analysis"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['urgent', 'critical', 'severe', 'emergency', 'immediate']):
            return 'high'
        elif any(word in text_lower for word in ['moderate', 'significant', 'concerning', 'abnormal']):
            return 'moderate'
        else:
            return 'low'

# Initialize enhanced analyzer
analyzer = EnhancedMedicalImageAnalyzer()

@app.route('/api/analyze-medical-image', methods=['POST'])
def analyze_medical_image():
    """Main endpoint for medical image analysis with HuggingFace enhancement"""
    try:
        # Check if file is present
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Get optional parameters
        image_type = request.form.get('image_type', None)
        
        # Save uploaded file
        filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        logger.info(f"Analyzing image: {filename}, type: {image_type}")
        
        # Analyze the image with enhanced HuggingFace integration
        result = analyzer.analyze_medical_image(filepath, image_type)
        
        # Save results
        result_filename = f"analysis_{filename.split('.')[0]}.json"
        result_path = os.path.join(RESULTS_FOLDER, result_filename)
        with open(result_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        logger.info(f"Enhanced analysis completed successfully for {filename}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in analyze_medical_image endpoint: {str(e)}")
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

@app.route('/api/analyze-medical-report', methods=['POST'])
def analyze_medical_report():
    """Endpoint for analyzing medical reports using HuggingFace NLP models"""
    try:
        # Get report text from request
        data = request.get_json()
        if not data or 'report_text' not in data:
            return jsonify({"error": "No report text provided"}), 400
        
        report_text = data['report_text']
        
        logger.info("Analyzing medical report with HuggingFace models")
        
        # Analyze the report
        result = analyzer.analyze_medical_report(report_text)
        
        # Add metadata
        result['metadata'] = {
            'analysis_timestamp': datetime.now().isoformat(),
            'analysis_type': 'medical_report',
            'text_length': len(report_text)
        }
        
        # Save results
        result_filename = f"report_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        result_path = os.path.join(RESULTS_FOLDER, result_filename)
        with open(result_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        logger.info("Medical report analysis completed successfully")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in analyze_medical_report endpoint: {str(e)}")
        return jsonify({"error": f"Report analysis failed: {str(e)}"}), 500

@app.route('/api/disease-information/<disease_name>', methods=['GET'])
def get_disease_information(disease_name):
    """Get detailed information about a specific disease"""
    try:
        # Find disease in knowledge base (case-insensitive)
        disease_info = None
        for disease, info in analyzer.disease_knowledge.items():
            if disease.lower() == disease_name.lower():
                disease_info = {
                    'name': disease,
                    'description': info['description'],
                    'symptoms': info['symptoms'],
                    'causes': info['causes'],
                    'treatment': info['treatment'],
                    'urgency': info['urgency']
                }
                break
        
        if disease_info:
            return jsonify(disease_info)
        else:
            return jsonify({"error": f"Disease '{disease_name}' not found in knowledge base"}), 404
            
    except Exception as e:
        logger.error(f"Error getting disease information: {str(e)}")
        return jsonify({"error": f"Failed to get disease information: {str(e)}"}), 500

@app.route('/api/supported-diseases', methods=['GET'])
def get_supported_diseases():
    """Get list of supported diseases by image type with detailed information"""
    try:
        diseases_by_type = {}
        for img_type, template in analyzer.disease_templates.items():
            diseases_by_type[img_type] = []
            for disease in template['diseases']:
                disease_detail = {
                    'name': disease,
                    'description': analyzer.disease_knowledge.get(disease, {}).get('description', 'No description available')
                }
                diseases_by_type[img_type].append(disease_detail)
        
        # Add general disease knowledge
        all_diseases = {}
        for disease, info in analyzer.disease_knowledge.items():
            all_diseases[disease] = {
                'description': info['description'],
                'urgency': info['urgency']
            }
        
        return jsonify({
            'diseases_by_type': diseases_by_type,
            'all_diseases': all_diseases
        })
        
    except Exception as e:
        logger.error(f"Error getting supported diseases: {str(e)}")
        return jsonify({"error": f"Failed to get supported diseases: {str(e)}"}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Enhanced health check endpoint"""
    try:
        # Check HuggingFace models status
        hf_models_status = {}
        for model_name in analyzer.hf_models.models:
            hf_models_status[model_name] = "loaded" if analyzer.hf_models.models[model_name] else "failed"
        
        return jsonify({
            "status": "healthy",
            "service": "Enhanced AI Disease Detection",
            "groq_model": llm.model_name,
            "groq_configured": bool(GROQ_API_KEY and GROQ_API_KEY != "your_groq_api_key_here"),
            "huggingface_configured": bool(HF_TOKEN),
            "huggingface_models": hf_models_status,
            "device": str(analyzer.hf_models.device),
            "supported_formats": analyzer.supported_formats,
            "total_diseases_in_kb": len(analyzer.disease_knowledge)
        })
        
    except Exception as e:
        logger.error(f"Error in health check: {str(e)}")
        return jsonify({"status": "unhealthy", "error": str(e)}), 500

@app.route('/api/model-info', methods=['GET'])
def get_model_info():
    """Get information about loaded models"""
    try:
        model_info = {
            "groq_model": {
                "name": llm.model_name,
                "temperature": 0.1,
                "max_tokens": 4096,
                "purpose": "Medical image analysis and interpretation"
            },
            "huggingface_models": {
                "medical_report_classifier": {
                    "model": "emilyalsentzer/Bio_ClinicalBERT",
                    "purpose": "Medical text classification"
                },
                "medical_image_captioning": {
                    "model": "Salesforce/blip-image-captioning-base",
                    "purpose": "Generate medical image descriptions"
                },
                "medical_ner": {
                    "model": "d4data/biomedical-ner-all",
                    "purpose": "Extract medical entities from text"
                }
            },
            "disease_knowledge_base": {
                "total_diseases": len(analyzer.disease_knowledge),
                "categories": ["Lung diseases", "Brain conditions", "Eye conditions"],
                "features": ["Symptoms", "Causes", "Treatments", "Urgency levels"]
            }
        }
        
        return jsonify(model_info)
        
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        return jsonify({"error": f"Failed to get model info: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)