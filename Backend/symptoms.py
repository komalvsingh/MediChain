from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import json
from langchain_groq import ChatGroq
import logging
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Symptom Checker API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required")

# Initialize Groq LLM
llm = ChatGroq(
    temperature=0.1,
    groq_api_key=GROQ_API_KEY,
    model_name="llama3-8b-8192"
)

# Pydantic models
class TextSymptomRequest(BaseModel):
    symptoms: str

class SymptomAnalysis(BaseModel):
    conditions: List[str]
    detailed_description: str
    possible_causes: List[str]
    tests: List[str]
    urgency: str
    home_care_tips: str = None
    when_to_seek_help: str
    first_aid: str = None

def translate_to_english(text: str) -> str:
    """Translate text to English if needed"""
    try:
        prompt = f"""
Translate the following text to English if it's in another language. If it's already in English, return it as is:

Text: "{text}"

Return only the English translation or the original text if already in English.
"""
        
        result = llm.invoke(prompt)
        
        # Extract content from the response
        if hasattr(result, 'content'):
            return result.content.strip()
        else:
            return str(result).strip()
            
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return text  # Return original if translation fails

def analyze_symptoms_detailed(symptoms: str) -> dict:
    """Enhanced symptom analysis with detailed descriptions"""
    try:
        # First translate to English if needed
        english_symptoms = translate_to_english(symptoms)
        
        prompt = f"""
You are an experienced medical AI assistant with comprehensive knowledge of symptoms, conditions, and medical care. A patient describes their symptoms: "{english_symptoms}"

Provide a thorough, informative analysis that helps the patient understand their symptoms better. Be specific about the conditions and provide educational information while emphasizing the importance of professional medical care.

Please provide your analysis in the following JSON format (make sure to return ONLY valid JSON without any markdown formatting):
{{
    "conditions": ["list of 3-4 most probable conditions with brief explanations"],
    "detailed_description": "comprehensive explanation of what these symptoms typically indicate, how they relate to each other, and what body systems might be involved",
    "possible_causes": ["list of 4-6 potential underlying causes or triggers for these symptoms"],
    "tests": ["list of specific medical tests or examinations that would help diagnose the condition"],
    "urgency": "Emergency/High/Moderate/Low",
    "home_care_tips": "practical self-care measures that may help alleviate symptoms (only for non-emergency cases)",
    "when_to_seek_help": "specific warning signs or timeframes that indicate when immediate medical attention is needed",
    "first_aid": "immediate steps to take if urgency is Emergency or High, otherwise null"
}}

Urgency Guidelines:
- Emergency: Life-threatening symptoms requiring immediate hospital care (chest pain with heart symptoms, severe breathing difficulty, signs of stroke, severe bleeding, etc.)
- High: Symptoms that need medical attention within hours (high fever, severe pain, persistent vomiting, etc.)
- Moderate: Symptoms that should be evaluated by a doctor within 1-3 days
- Low: Symptoms that can be monitored and may resolve with home care, but should be discussed with a healthcare provider if persistent

Important: Provide specific, educational information about the symptoms while always emphasizing that this is for informational purposes only and professional medical evaluation is necessary for proper diagnosis and treatment.

Return ONLY the JSON object without any additional text, markdown formatting, or code blocks.
"""
        
        result = llm.invoke(prompt)
        
        # Extract content from the response
        if hasattr(result, 'content'):
            response_text = result.content.strip()
        else:
            response_text = str(result).strip()
        
        logger.info(f"Raw LLM response: {response_text}")
        
        # Clean the response to extract JSON
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parse JSON response
        try:
            analysis = json.loads(response_text)
            
            # Validate and sanitize the response
            required_fields = ['conditions', 'detailed_description', 'possible_causes', 'tests', 'urgency', 'when_to_seek_help']
            for field in required_fields:
                if field not in analysis:
                    analysis[field] = get_default_value(field)
            
            # Ensure lists are properly formatted
            if not isinstance(analysis.get('conditions', []), list):
                analysis['conditions'] = [str(analysis.get('conditions', 'Unknown condition'))]
            if not isinstance(analysis.get('possible_causes', []), list):
                analysis['possible_causes'] = [str(analysis.get('possible_causes', 'Unknown cause'))]
            if not isinstance(analysis.get('tests', []), list):
                analysis['tests'] = [str(analysis.get('tests', 'General health checkup'))]
            
            # Ensure home_care_tips is not null for non-emergency cases
            if analysis.get('urgency', '').lower() not in ['emergency', 'high'] and not analysis.get('home_care_tips'):
                analysis['home_care_tips'] = "Rest, stay hydrated, monitor symptoms, and maintain good hygiene practices."
            
            logger.info(f"Processed analysis: {analysis}")
            return analysis
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {response_text}")
            logger.error(f"JSON error: {e}")
            # Return a more informative fallback response
            return create_fallback_analysis(english_symptoms)
            
    except Exception as e:
        logger.error(f"Symptom analysis error: {e}")
        return create_fallback_analysis(symptoms)

def get_default_value(field: str):
    """Get default values for required fields"""
    defaults = {
        'conditions': ['Please consult a healthcare professional for proper evaluation'],
        'detailed_description': 'Unable to provide detailed analysis. Please consult with a healthcare professional for proper symptom evaluation.',
        'possible_causes': ['Multiple factors could contribute to these symptoms'],
        'tests': ['Comprehensive medical examination recommended'],
        'urgency': 'Moderate',
        'when_to_seek_help': 'Consult with a healthcare professional for proper evaluation and diagnosis'
    }
    return defaults.get(field, 'Not available')

def create_fallback_analysis(symptoms: str) -> dict:
    """Create a fallback analysis when JSON parsing fails"""
    return {
        "conditions": [f"Analysis of symptoms: {symptoms[:100]}..." if len(symptoms) > 100 else f"Analysis of symptoms: {symptoms}"],
        "detailed_description": f"You've described symptoms that warrant medical evaluation. While I cannot provide a specific diagnosis, these symptoms could be related to various conditions that require professional assessment.",
        "possible_causes": [
            "Viral or bacterial infections",
            "Inflammatory conditions", 
            "Stress or lifestyle factors",
            "Underlying medical conditions"
        ],
        "tests": ["Complete medical history and physical examination", "Basic blood tests if recommended by doctor"],
        "urgency": "Moderate",
        "home_care_tips": "Rest, stay hydrated, monitor symptoms, and avoid self-medication without professional guidance",
        "when_to_seek_help": "Seek medical attention if symptoms worsen, persist beyond a few days, or if you develop additional concerning symptoms",
        "first_aid": None
    }

@app.get("/")
async def root():
    return {"message": "AI Symptom Checker API is running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "groq_available": GROQ_API_KEY is not None
    }

@app.post("/api/process-text")
async def process_text_symptoms(request: TextSymptomRequest):
    """Process text-based symptom input with detailed analysis"""
    try:
        logger.info(f"Processing symptoms: {request.symptoms}")
        
        # Use the enhanced analysis function
        analysis = analyze_symptoms_detailed(request.symptoms)
        
        logger.info(f"Analysis result: {analysis}")
        
        return {"analysis": analysis}
    
    except Exception as e:
        logger.error(f"Error processing text symptoms: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)