import re
import os
import tempfile
import pytesseract
from PIL import Image
import pdf2image
import numpy as np
import torch
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import json
from datetime import datetime
import logging
import traceback

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Flask app setup
app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'temp_uploads'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB max file size

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Try to set Tesseract path - adjust for your system
TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',  # Windows
    '/usr/bin/tesseract',  # Linux
    '/usr/local/bin/tesseract',  # macOS with Homebrew
    '/opt/homebrew/bin/tesseract'  # macOS with M1 Homebrew
]

tesseract_found = False
for path in TESSERACT_PATHS:
    if os.path.exists(path):
        pytesseract.pytesseract.tesseract_cmd = path
        tesseract_found = True
        logger.info(f"Tesseract found at: {path}")
        break

if not tesseract_found:
    logger.warning("Tesseract not found in common locations. OCR may not work.")

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

class MedicalReportAnalyzer:
    def __init__(self):
        """Initialize the medical report analyzer with fallback to basic analysis."""
        logger.info("Initializing Medical Report Analyzer...")
        
        # Initialize NLP models with error handling
        self.clinical_classifier = None
        self.ner_pipeline = None
        
        # Try to load advanced models, but don't fail if they're not available
        try:
            from transformers import pipeline
            logger.info("Attempting to load transformers models...")
            
            # Try to load clinical BERT
            try:
                self.clinical_classifier = pipeline(
                    "text-classification",
                    model="emilyalsentzer/Bio_ClinicalBERT",
                    device=-1  # Force CPU to avoid CUDA issues
                )
                logger.info("Clinical BERT loaded successfully")
            except Exception as e:
                logger.warning(f"Could not load Clinical BERT: {e}")
            
            # Try to load NER model
            try:
                self.ner_pipeline = pipeline(
                    "ner",
                    model="d4data/biomedical-ner-all",
                    aggregation_strategy="simple",
                    device=-1  # Force CPU
                )
                logger.info("NER pipeline loaded successfully")
            except Exception as e:
                logger.warning(f"Could not load NER pipeline: {e}")
                
        except ImportError:
            logger.warning("Transformers library not available. Using basic analysis only.")
        except Exception as e:
            logger.warning(f"Error initializing advanced models: {e}")
        
        # Lab value ranges (this will always work)
        self.lab_ranges = {
            'glucose': {
                'ranges': [(70, 99, 'normal'), (100, 125, 'prediabetes'), (126, float('inf'), 'diabetes')],
                'patterns': [r'glucose[:\s]*(\d+\.?\d*)', r'blood\s+sugar[:\s]*(\d+\.?\d*)', r'fbs[:\s]*(\d+\.?\d*)'],
                'unit_conversions': {'mmol/l': 18.0}
            },
            'hba1c': {
                'ranges': [(0, 5.6, 'normal'), (5.7, 6.4, 'prediabetes'), (6.5, float('inf'), 'diabetes')],
                'patterns': [r'hba1c[:\s]*(\d+\.?\d*)', r'hemoglobin\s+a1c[:\s]*(\d+\.?\d*)', r'glycated\s+hemoglobin[:\s]*(\d+\.?\d*)']
            },
            'cholesterol_total': {
                'ranges': [(0, 199, 'normal'), (200, 239, 'borderline_high'), (240, float('inf'), 'high')],
                'patterns': [r'total\s+cholesterol[:\s]*(\d+\.?\d*)', r'cholesterol[:\s]*(\d+\.?\d*)'],
                'conditions': ['hyperlipidemia', 'cardiovascular_risk']
            },
            'ldl': {
                'ranges': [(0, 99, 'optimal'), (100, 129, 'near_optimal'), (130, 159, 'borderline_high'), (160, 189, 'high'), (190, float('inf'), 'very_high')],
                'patterns': [r'ldl[:\s]*(\d+\.?\d*)', r'low\s+density\s+lipoprotein[:\s]*(\d+\.?\d*)'],
                'conditions': ['hyperlipidemia', 'cardiovascular_risk']
            },
            'hdl': {
                'ranges': [(60, float('inf'), 'good'), (40, 59, 'low_normal'), (0, 39, 'low')],
                'patterns': [r'hdl[:\s]*(\d+\.?\d*)', r'high\s+density\s+lipoprotein[:\s]*(\d+\.?\d*)'],
                'conditions': ['low_hdl', 'cardiovascular_risk']
            },
            'blood_pressure_systolic': {
                'ranges': [(0, 119, 'normal'), (120, 129, 'elevated'), (130, 139, 'stage1_hypertension'), (140, 179, 'stage2_hypertension'), (180, float('inf'), 'hypertensive_crisis')],
                'patterns': [r'bp[:\s]*(\d+)\/\d+', r'blood\s+pressure[:\s]*(\d+)\/\d+', r'systolic[:\s]*(\d+)'],
                'conditions': ['hypertension']
            },
            'blood_pressure_diastolic': {
                'ranges': [(0, 79, 'normal'), (80, 89, 'stage1_hypertension'), (90, 119, 'stage2_hypertension'), (120, float('inf'), 'hypertensive_crisis')],
                'patterns': [r'bp[:\s]*\d+\/(\d+)', r'blood\s+pressure[:\s]*\d+\/(\d+)', r'diastolic[:\s]*(\d+)'],
                'conditions': ['hypertension']
            },
            'hemoglobin': {
                'ranges': [(12.0, 16.0, 'normal_female'), (14.0, 18.0, 'normal_male'), (0, 11.9, 'anemia')],
                'patterns': [r'hemoglobin[:\s]*(\d+\.?\d*)', r'hb[:\s]*(\d+\.?\d*)', r'hgb[:\s]*(\d+\.?\d*)'],
                'conditions': ['anemia']
            },
            'creatinine': {
                'ranges': [(0.6, 1.2, 'normal'), (1.3, 3.0, 'mild_kidney_disease'), (3.1, float('inf'), 'severe_kidney_disease')],
                'patterns': [r'creatinine[:\s]*(\d+\.?\d*)', r'cr[:\s]*(\d+\.?\d*)'],
                'conditions': ['chronic_kidney_disease']
            }
        }
        
        # Disease patterns for keyword matching
        self.disease_patterns = {
            'diabetes': {
                'keywords': ['diabetes', 'diabetic', 'dm', 'hyperglycemia', 'insulin', 'metformin'],
                'patterns': [r'\b(?:type\s*[12]\s*)?diabet(?:es|ic)\b', r'\bhyperglycemi[ac]\b']
            },
            'hypertension': {
                'keywords': ['hypertension', 'high blood pressure', 'htn', 'elevated bp'],
                'patterns': [r'\bhypertension\b', r'\bhigh\s+blood\s+pressure\b', r'\bhtn\b']
            },
            'hyperlipidemia': {
                'keywords': ['hyperlipidemia', 'dyslipidemia', 'high cholesterol', 'elevated lipids'],
                'patterns': [r'\bhyperlipidemia\b', r'\bdyslipidemia\b', r'\bhigh\s+cholesterol\b']
            },
            'anemia': {
                'keywords': ['anemia', 'low hemoglobin', 'iron deficiency', 'low hb'],
                'patterns': [r'\banemi[ac]\b', r'\blow\s+hemoglobin\b']
            }
        }
        
        logger.info("Medical Report Analyzer initialized successfully")

    def extract_text_from_image(self, image_path):
        """Extract text from an image file with enhanced preprocessing."""
        try:
            logger.debug(f"Extracting text from image: {image_path}")
            
            # Check if tesseract is available
            if not tesseract_found:
                raise Exception("Tesseract OCR not found. Please install Tesseract OCR.")
            
            image = Image.open(image_path)
            # Convert to grayscale for better OCR
            image = image.convert('L')
            
            # Try different OCR configurations
            configs = [
                '--psm 6',  # Uniform block of text
                '--psm 4',  # Single column of text
                '--psm 3'   # Fully automatic page segmentation
            ]
            
            best_text = ""
            for config in configs:
                try:
                    text = pytesseract.image_to_string(image, config=config)
                    if len(text.strip()) > len(best_text.strip()):
                        best_text = text
                except Exception as e:
                    logger.debug(f"OCR config {config} failed: {e}")
                    continue
            
            if not best_text.strip():
                # Fallback to basic OCR
                best_text = pytesseract.image_to_string(image)
            
            logger.debug(f"Extracted {len(best_text)} characters from image")
            return best_text
            
        except Exception as e:
            logger.error(f"Error extracting text from image: {e}")
            raise Exception(f"Error extracting text from image: {str(e)}")

    def extract_text_from_pdf(self, pdf_path):
        """Extract text from a PDF file."""
        try:
            logger.debug(f"Extracting text from PDF: {pdf_path}")
            
            # Convert PDF to images
            images = pdf2image.convert_from_path(pdf_path, dpi=200)  # Lower DPI for faster processing
            text = ""
            
            for i, img in enumerate(images):
                logger.debug(f"Processing page {i+1}")
                # Save image temporarily
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_img:
                    img.save(temp_img.name, 'PNG')
                    page_text = self.extract_text_from_image(temp_img.name)
                    text += f"\n--- Page {i+1} ---\n{page_text}\n"
                    # Clean up temp file
                    try:
                        os.unlink(temp_img.name)
                    except:
                        pass
            
            logger.debug(f"Extracted {len(text)} characters from PDF")
            return text
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise Exception(f"Error extracting text from PDF: {str(e)}")

    def preprocess_text(self, text):
        """Basic text preprocessing."""
        try:
            # Remove potential PII
            text = re.sub(r'\b(?:patient|name|date|id|contact|address|phone|ssn)\b[:\s]*[^\n]*', '', text, flags=re.IGNORECASE)
            # Normalize units
            text = re.sub(r'\b(?:mg/dl|mg%)\b', 'mg/dL', text, flags=re.IGNORECASE)
            # Clean whitespace
            text = re.sub(r'\s+', ' ', text)
            text = text.strip()
            return text
        except Exception as e:
            logger.error(f"Error preprocessing text: {e}")
            return text  # Return original text if preprocessing fails

    def extract_lab_values(self, text):
        """Extract lab values using regex patterns."""
        extracted_values = {}
        
        try:
            for lab_name, lab_info in self.lab_ranges.items():
                for pattern in lab_info['patterns']:
                    matches = re.finditer(pattern, text, re.IGNORECASE)
                    for match in matches:
                        try:
                            value = float(match.group(1))
                            
                            # Handle unit conversions
                            if 'unit_conversions' in lab_info:
                                context = text[max(0, match.start()-50):match.end()+50].lower()
                                for unit, conversion_factor in lab_info['unit_conversions'].items():
                                    if unit in context:
                                        value *= conversion_factor
                                        break
                            
                            extracted_values[lab_name] = value
                            logger.debug(f"Found {lab_name}: {value}")
                            break
                        except (ValueError, IndexError) as e:
                            logger.debug(f"Error parsing value for {lab_name}: {e}")
                            continue
                    if lab_name in extracted_values:
                        break
                        
        except Exception as e:
            logger.error(f"Error extracting lab values: {e}")
        
        return extracted_values

    def analyze_lab_values(self, lab_values):
        """Analyze lab values against reference ranges."""
        conditions = []
        detailed_results = {}
        
        try:
            for lab_name, value in lab_values.items():
                if lab_name not in self.lab_ranges:
                    continue
                    
                lab_info = self.lab_ranges[lab_name]
                ranges = lab_info['ranges']
                
                status = 'unknown'
                for min_val, max_val, range_status in ranges:
                    if min_val <= value <= max_val:
                        status = range_status
                        break
                
                detailed_results[lab_name] = {
                    'value': value,
                    'status': status,
                    'normal': status in ['normal', 'optimal', 'good', 'normal_female', 'normal_male']
                }
                
                # Add conditions if abnormal
                if 'conditions' in lab_info and not detailed_results[lab_name]['normal']:
                    conditions.extend(lab_info['conditions'])
                    
        except Exception as e:
            logger.error(f"Error analyzing lab values: {e}")
        
        return conditions, detailed_results

    def extract_diseases_by_keywords(self, text):
        """Extract diseases using keyword matching."""
        detected_diseases = []
        confidence_scores = {}
        
        try:
            for disease, disease_info in self.disease_patterns.items():
                score = 0
                
                # Check keywords
                for keyword in disease_info['keywords']:
                    if keyword.lower() in text.lower():
                        score += 1
                
                # Check patterns
                for pattern in disease_info['patterns']:
                    matches = re.findall(pattern, text, re.IGNORECASE)
                    score += len(matches) * 2
                
                if score > 0:
                    detected_diseases.append(disease)
                    confidence_scores[disease] = min(score / 3.0, 1.0)
                    logger.debug(f"Detected {disease} with score {score}")
                    
        except Exception as e:
            logger.error(f"Error extracting diseases by keywords: {e}")
        
        return detected_diseases, confidence_scores

    def analyze_medical_report(self, report_text):
        """Main analysis function with comprehensive error handling."""
        try:
            logger.info("Starting medical report analysis")
            
            # Preprocess text
            cleaned_text = self.preprocess_text(report_text)
            logger.debug(f"Preprocessed text: {len(cleaned_text)} characters")
            
            # Extract lab values
            lab_values = self.extract_lab_values(cleaned_text)
            logger.debug(f"Found lab values: {list(lab_values.keys())}")
            
            # Analyze lab values
            lab_conditions, lab_details = self.analyze_lab_values(lab_values)
            
            # Extract diseases by keywords
            keyword_diseases, keyword_confidence = self.extract_diseases_by_keywords(cleaned_text)
            logger.debug(f"Found diseases: {keyword_diseases}")
            
            # Combine all conditions
            all_conditions = list(set(lab_conditions + keyword_diseases))
            
            # Generate summary
            summary = self.generate_summary(all_conditions, lab_details)
            
            results = {
                'conditions': all_conditions,
                'lab_values': lab_values,
                'lab_details': lab_details,
                'keyword_confidence': keyword_confidence,
                'entities': [],  # Placeholder for now
                'summary': summary,
                'analysis_timestamp': datetime.now().isoformat()
            }
            
            logger.info("Analysis completed successfully")
            return results
            
        except Exception as e:
            logger.error(f"Error in analyze_medical_report: {e}")
            logger.error(traceback.format_exc())
            raise Exception(f"Analysis failed: {str(e)}")

    def generate_summary(self, conditions, lab_details):
        """Generate a summary of findings."""
        try:
            if not conditions and not lab_details:
                return "No significant abnormalities detected in the available data."
            
            summary_parts = []
            
            if conditions:
                summary_parts.append(f"Potential conditions identified: {', '.join(conditions)}")
            
            if lab_details:
                abnormal_labs = [lab for lab, details in lab_details.items() if not details['normal']]
                if abnormal_labs:
                    summary_parts.append(f"Abnormal lab values detected for: {', '.join(abnormal_labs)}")
            
            summary_parts.append("Please consult with a healthcare provider for proper diagnosis and treatment.")
            
            return " ".join(summary_parts)
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return "Analysis completed. Please consult with a healthcare provider for interpretation."

# Initialize the analyzer
try:
    analyzer = MedicalReportAnalyzer()
    logger.info("Analyzer initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize analyzer: {e}")
    analyzer = None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy', 
        'message': 'Medical Report Analyzer API is running',
        'tesseract_available': tesseract_found,
        'analyzer_ready': analyzer is not None
    })

@app.route('/analyze', methods=['POST'])
def analyze_report():
    """Main endpoint to analyze medical reports."""
    try:
        logger.info("Received analysis request")
        
        # Check if analyzer is available
        if not analyzer:
            return jsonify({'error': 'Analyzer not properly initialized'}), 500
        
        # Check if file is present
        if 'file' not in request.files:
            logger.warning("No file in request")
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            logger.warning("Empty filename")
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        if not allowed_file(file.filename):
            logger.warning(f"Invalid file type: {file.filename}")
            return jsonify({'error': 'File type not allowed. Please upload PDF, PNG, JPG, JPEG, TIFF, or BMP files.'}), 400
        
        # Secure the filename
        filename = secure_filename(file.filename)
        logger.info(f"Processing file: {filename}")
        
        # Create temporary file
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                file.save(temp_file.name)
                temp_path = temp_file.name
                logger.debug(f"Saved temp file: {temp_path}")
            
            # Extract text based on file type
            if filename.lower().endswith('.pdf'):
                logger.info("Extracting text from PDF")
                report_text = analyzer.extract_text_from_pdf(temp_path)
            else:
                logger.info("Extracting text from image")
                report_text = analyzer.extract_text_from_image(temp_path)
            
            # Check if text was extracted
            if not report_text or not report_text.strip():
                logger.warning("No text extracted from file")
                return jsonify({'error': 'No text could be extracted from the file. Please check the file quality and format.'}), 400
            
            logger.info(f"Extracted {len(report_text)} characters")
            
            # Analyze the report
            results = analyzer.analyze_medical_report(report_text)
            
            # Add metadata
            results['filename'] = filename
            results['extracted_text_length'] = len(report_text)
            
            logger.info("Analysis completed successfully")
            return jsonify({
                'success': True,
                'data': results
            })
            
        except Exception as e:
            logger.error(f"Error processing file: {e}")
            logger.error(traceback.format_exc())
            return jsonify({'error': f'Analysis failed: {str(e)}'}), 500
            
        finally:
            # Clean up temporary file
            if temp_path:
                try:
                    os.unlink(temp_path)
                    logger.debug(f"Cleaned up temp file: {temp_path}")
                except Exception as e:
                    logger.warning(f"Could not clean up temp file: {e}")
                
    except Exception as e:
        logger.error(f"Unexpected error in analyze_report: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/supported-formats', methods=['GET'])
def get_supported_formats():
    """Get list of supported file formats."""
    return jsonify({
        'supported_formats': list(ALLOWED_EXTENSIONS),
        'max_file_size_mb': MAX_FILE_SIZE / (1024 * 1024),
        'description': 'Upload medical reports in PDF or image format for analysis',
        'tesseract_available': tesseract_found
    })

if __name__ == '__main__':
    print("=" * 50)
    print("Medical Report Analyzer API")
    print("=" * 50)
    print(f"Supported formats: {', '.join(ALLOWED_EXTENSIONS)}")
    print(f"Max file size: {MAX_FILE_SIZE / (1024 * 1024)}MB")
    print(f"Tesseract OCR: {'Available' if tesseract_found else 'NOT FOUND'}")
    print(f"Analyzer: {'Ready' if analyzer else 'FAILED TO INITIALIZE'}")
    print("API will be available at: http://localhost:5000")
    print("=" * 50)
    
    if not tesseract_found:
        print("\nWARNING: Tesseract OCR not found!")
        print("Please install Tesseract OCR:")
        print("- Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki")
        print("- macOS: brew install tesseract")
        print("- Ubuntu/Debian: sudo apt-get install tesseract-ocr")
        print()
    
    app.run(debug=True, host='0.0.0.0', port=5000)