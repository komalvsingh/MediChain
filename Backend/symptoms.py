from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import json
import requests
import tempfile
import math
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
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required")

if not GOOGLE_MAPS_API_KEY:
    logger.warning("GOOGLE_MAPS_API_KEY not set - clinic search will be disabled")

# Initialize models
whisper_model = None
try:
    import whisper
    whisper_model = whisper.load_model("base")
    logger.info("Whisper model loaded successfully")
except ImportError as e:
    logger.warning(f"Whisper not available - voice processing will be disabled: {e}")
except Exception as e:
    logger.error(f"Failed to load Whisper model: {e}")
    whisper_model = None

# Initialize Groq LLM
llm = ChatGroq(
    temperature=0.1,
    groq_api_key=GROQ_API_KEY,
    model_name="llama3-8b-8192"
)

# Pydantic models
class TextSymptomRequest(BaseModel):
    symptoms: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ClinicInfo(BaseModel):
    name: str
    address: str
    rating: Optional[float] = None
    distance: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    place_id: Optional[str] = None

class SymptomAnalysis(BaseModel):
    conditions: List[str]
    tests: List[str]
    urgency: str
    first_aid: Optional[str] = None
    nearby_clinics: Optional[List[ClinicInfo]] = None

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat/2) * math.sin(dlat/2) + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dlon/2) * math.sin(dlon/2))
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c
    
    return round(distance, 1)

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

def analyze_symptoms(symptoms: str) -> dict:
    """Analyze symptoms using Groq LLM"""
    try:
        # First translate to English if needed
        english_symptoms = translate_to_english(symptoms)
        
        prompt = f"""
You are an experienced medical AI assistant. A patient describes their symptoms: "{english_symptoms}"

Please provide a detailed analysis in the following JSON format:
{{
    "conditions": ["list of 2-3 most probable conditions/diseases"],
    "tests": ["list of recommended medical tests"],
    "urgency": "Emergency/Moderate/Mild",
    "first_aid": "immediate steps to take if urgency is Emergency or Moderate, null for Mild"
}}

Guidelines:
- Be thorough but not alarming
- Focus on common conditions first
- For Emergency: life-threatening symptoms requiring immediate medical attention
- For Moderate: symptoms that need medical consultation within 24-48 hours
- For Mild: symptoms that can be monitored and may resolve with home care
- Always recommend consulting a healthcare professional for proper diagnosis

Respond only with valid JSON format.
"""
        
        result = llm.invoke(prompt)
        
        # Extract content from the response
        if hasattr(result, 'content'):
            response_text = result.content.strip()
        else:
            response_text = str(result).strip()
        
        # Parse JSON response
        try:
            analysis = json.loads(response_text)
            return analysis
        except json.JSONDecodeError:
            # If JSON parsing fails, create a basic response
            logger.error(f"Failed to parse JSON response: {response_text}")
            return {
                "conditions": ["Unable to analyze - please consult a healthcare professional"],
                "tests": ["Basic health checkup recommended"],
                "urgency": "Moderate",
                "first_aid": "Please consult with a healthcare professional for proper evaluation"
            }
    except Exception as e:
        logger.error(f"Symptom analysis error: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze symptoms")

def get_place_details(place_id: str) -> dict:
    """Get additional details for a place"""
    if not GOOGLE_MAPS_API_KEY:
        return {}
        
    try:
        url = "https://maps.googleapis.com/maps/api/place/details/json"
        params = {
            "place_id": place_id,
            "fields": "name,formatted_address,rating,opening_hours,formatted_phone_number,geometry",
            "key": GOOGLE_MAPS_API_KEY
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json().get("result", {})
    except Exception as e:
        logger.error(f"Error getting place details: {e}")
        return {}

def get_nearby_clinics(latitude: float, longitude: float) -> List[ClinicInfo]:
    """Get nearby clinics using Google Maps API with coordinates"""
    if not GOOGLE_MAPS_API_KEY:
        # Return mock data for testing
        return [
            ClinicInfo(
                name="City General Hospital",
                address="123 Main Street, City Center",
                rating=4.2,
                distance="1.2 km",
                latitude=latitude + 0.01,
                longitude=longitude + 0.01,
                phone="+1-555-0123",
                place_id="mock_place_id_1"
            ),
            ClinicInfo(
                name="Apollo Medical Center",
                address="456 Health Avenue, Medical District",
                rating=4.5,
                distance="2.1 km",
                latitude=latitude - 0.015,
                longitude=longitude + 0.008,
                phone="+1-555-0456",
                place_id="mock_place_id_2"
            ),
            ClinicInfo(
                name="Wellness Clinic",
                address="789 Care Boulevard, Healthcare Zone",
                rating=4.0,
                distance="3.0 km",
                latitude=latitude + 0.02,
                longitude=longitude - 0.012,
                phone="+1-555-0789",
                place_id="mock_place_id_3"
            )
        ]
    
    try:
        # Search for hospitals
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            "location": f"{latitude},{longitude}",
            "radius": 10000,  # 10km radius
            "type": "hospital",
            "key": GOOGLE_MAPS_API_KEY
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        clinics = []
        
        for place in data.get("results", [])[:8]:
            try:
                place_lat = place["geometry"]["location"]["lat"]
                place_lng = place["geometry"]["location"]["lng"]
                
                distance_km = calculate_distance(latitude, longitude, place_lat, place_lng)
                
                # Get additional details
                place_details = get_place_details(place.get("place_id", ""))
                
                clinic = ClinicInfo(
                    name=place.get("name", "Unknown"),
                    address=place.get("vicinity", place_details.get("formatted_address", "Address not available")),
                    rating=place.get("rating"),
                    distance=f"{distance_km} km",
                    latitude=place_lat,
                    longitude=place_lng,
                    phone=place_details.get("formatted_phone_number"),
                    place_id=place.get("place_id")
                )
                clinics.append(clinic)
            except Exception as e:
                logger.error(f"Error processing clinic data: {e}")
                continue
        
        # Sort by distance
        clinics.sort(key=lambda x: float(x.distance.split()[0]))
        return clinics[:5]  # Return top 5 closest clinics
        
    except Exception as e:
        logger.error(f"Error fetching nearby clinics: {e}")
        return []

@app.get("/")
async def root():
    return {"message": "AI Symptom Checker API is running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "whisper_available": whisper_model is not None,
        "groq_available": GROQ_API_KEY is not None,
        "maps_available": GOOGLE_MAPS_API_KEY is not None
    }

@app.post("/api/process-text")
async def process_text_symptoms(request: TextSymptomRequest):
    """Process text-based symptom input"""
    try:
        # Analyze symptoms
        analysis = analyze_symptoms(request.symptoms)
        
        # Get nearby clinics if location is provided
        if request.latitude and request.longitude:
            clinics = get_nearby_clinics(request.latitude, request.longitude)
            analysis["nearby_clinics"] = [clinic.dict() for clinic in clinics]
        
        return {"analysis": analysis}
    
    except Exception as e:
        logger.error(f"Error processing text symptoms: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-voice")
async def process_voice_symptoms(
    audio: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None)
):
    """Process voice-based symptom input"""
    if not whisper_model:
        raise HTTPException(status_code=503, detail="Voice processing not available")
    
    try:
        # Save uploaded audio to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Transcribe audio using Whisper
            result = whisper_model.transcribe(temp_file_path)
            transcribed_text = result["text"].strip()
            
            if not transcribed_text:
                raise HTTPException(status_code=400, detail="Could not transcribe audio")
            
            # Analyze symptoms
            analysis = analyze_symptoms(transcribed_text)
            
            # Get nearby clinics if location is provided
            if latitude and longitude:
                clinics = get_nearby_clinics(latitude, longitude)
                analysis["nearby_clinics"] = [clinic.dict() for clinic in clinics]
            
            return {
                "transcribed_text": transcribed_text,
                "analysis": analysis
            }
        
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
    
    except Exception as e:
        logger.error(f"Error processing voice symptoms: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/get-clinics")
async def get_clinics_endpoint(latitude: float, longitude: float):
    """Get nearby clinics for given coordinates"""
    try:
        clinics = get_nearby_clinics(latitude, longitude)
        return {"clinics": [clinic.dict() for clinic in clinics]}
    except Exception as e:
        logger.error(f"Error getting clinics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)