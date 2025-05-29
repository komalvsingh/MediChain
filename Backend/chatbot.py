import os
import uuid
import time
import tempfile
import requests
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import speech_recognition as sr
from deep_translator import GoogleTranslator
from gtts import gTTS
from langdetect import detect

from dotenv import load_dotenv

# Alternative imports for Windows compatibility
try:
    # Try standard langchain imports first
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import Chroma
    from langchain_community.document_loaders import TextLoader
    from langchain.text_splitter import RecursiveCharacterTextSplitter
except ImportError:
    try:
        # Fallback to older langchain imports
        from langchain.embeddings import HuggingFaceEmbeddings
        from langchain.vectorstores import Chroma
        from langchain.document_loaders import TextLoader
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        # Final fallback - use sentence transformers directly
        print("Warning: LangChain imports failed. Using basic text processing.")
        HuggingFaceEmbeddings = None
        Chroma = None
        TextLoader = None
        RecursiveCharacterTextSplitter = None

# Load environment variables
load_dotenv()

# Get API key from environment
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

app = FastAPI(title="MediChain AI Chatbot", description="AI-powered medical symptom checker and health assistant")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audio files directory
UPLOAD_DIR = Path("audio_files")
UPLOAD_DIR.mkdir(exist_ok=True)

# ChromaDB Configuration
CHROMA_DIR = Path("./medichain_chroma_db")
CHROMA_DIR.mkdir(exist_ok=True)

# Embedding model
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# Health data file
HEALTH_DATA_FILE = "health.txt"

# Pydantic Models
class QueryModel(BaseModel):
    message: str
    user_id: Optional[str] = None
    language: Optional[str] = "en"

class SymptomAnalysisModel(BaseModel):
    symptoms: List[str]
    age: Optional[int] = None
    gender: Optional[str] = None
    medical_history: Optional[List[str]] = []
    duration: Optional[str] = None
    severity: Optional[str] = None

class HealthProfileModel(BaseModel):
    user_id: str
    age: int
    gender: str
    medical_history: List[str]
    allergies: List[str]
    current_medications: List[str]

class DiagnosisResponse(BaseModel):
    possible_conditions: List[str]
    recommendations: List[str]
    urgency_level: str
    next_steps: List[str]

def load_medical_data_simple(data_file=HEALTH_DATA_FILE):
    """
    Simple fallback method to load medical data without ChromaDB
    """
    try:
        if os.path.exists(data_file):
            with open(data_file, 'r', encoding='utf-8') as f:
                content = f.read()
            return content
        else:
            return "Basic medical knowledge base not found."
    except Exception as e:
        print(f"Error loading medical data: {e}")
        return ""

def load_and_store_medical_data(data_file=HEALTH_DATA_FILE):
    """
    Load and store medical data from health.txt file in ChromaDB vector store
    """
    try:
        if not HuggingFaceEmbeddings or not Chroma or not TextLoader:
            print("ChromaDB not available, using simple text loading")
            return load_medical_data_simple(data_file)
            
        if not os.path.exists(data_file):
            print(f"Warning: {data_file} not found. Creating empty vector store.")
            # Create empty vector store
            embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
            db = Chroma(persist_directory=str(CHROMA_DIR), embedding_function=embeddings)
            return db
            
        loader = TextLoader(data_file, encoding='utf-8')
        docs = loader.load()
        
        # Split documents into chunks for better retrieval
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,  # Larger chunks for medical context
            chunk_overlap=100,
            separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""]
        )
        texts = text_splitter.split_documents(docs)
        
        # Create embeddings
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        
        # Create or update ChromaDB
        db = Chroma.from_documents(
            texts, 
            embeddings, 
            persist_directory=str(CHROMA_DIR)
        )
        print(f"Successfully loaded {len(texts)} chunks from {data_file}")
        return db
    except Exception as e:
        print(f"Error loading medical data: {e}")
        if HuggingFaceEmbeddings and Chroma:
            embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
            return Chroma(persist_directory=str(CHROMA_DIR), embedding_function=embeddings)
        else:
            return load_medical_data_simple(data_file)

# Initialize or load ChromaDB with medical data
try:
    if HuggingFaceEmbeddings and Chroma:
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        vectorstore = Chroma(
            persist_directory=str(CHROMA_DIR), 
            embedding_function=embeddings
        )
        print("Loaded existing medical vector store")
    else:
        vectorstore = load_medical_data_simple()
        print("Using simple text-based medical data")
except:
    print("Creating new medical vector store")
    vectorstore = load_and_store_medical_data()

def detect_language(text):
    """Detect language of the input text."""
    try:
        detected_lang = detect(text)
        # Map common language codes
        lang_mapping = {
            'hi': 'hi',  # Hindi
            'es': 'es',  # Spanish
            'fr': 'fr',  # French
            'de': 'de',  # German
            'it': 'it',  # Italian
            'pt': 'pt',  # Portuguese
            'ru': 'ru',  # Russian
            'ja': 'ja',  # Japanese
            'ko': 'ko',  # Korean
            'zh': 'zh',  # Chinese
            'ar': 'ar',  # Arabic
        }
        return lang_mapping.get(detected_lang, 'en')
    except:
        return 'en'

def get_translator(target_lang='en'):
    """Get a translator for the specified target language."""
    return GoogleTranslator(source='auto', target=target_lang)

def text_to_speech(text, lang='en'):
    """Convert text to speech and save as an audio file."""
    try:
        # Generate unique filename
        audio_filename = f"medichain_{uuid.uuid4()}.mp3"
        filepath = UPLOAD_DIR / audio_filename
        
        # Limit text length for TTS
        tts_text = text[:800] if len(text) > 800 else text
        
        # Use gTTS for text-to-speech
        tts = gTTS(text=tts_text, lang=lang, slow=False)
        tts.save(str(filepath))
        
        return audio_filename
    except Exception as e:
        print(f"Text-to-speech error: {e}")
        return None

def retrieve_medical_context(query, top_k=5):
    """
    Retrieve relevant medical context from ChromaDB or simple text
    """
    try:
        if hasattr(vectorstore, 'similarity_search'):
            # ChromaDB available
            docs = vectorstore.similarity_search(query, k=top_k)
            context = "\n\n".join([doc.page_content for doc in docs])
        else:
            # Simple text fallback
            context = vectorstore if isinstance(vectorstore, str) else ""
            
        return context
    except Exception as e:
        print(f"Medical context retrieval error: {e}")
        return ""

def generate_medical_response(message, context="", user_profile=None):
    """Generate a medical response using Groq API with medical context."""
    try:
        # Prepare headers
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Enhanced medical prompt
        system_prompt = """You are MediChain AI, an advanced medical assistant specialized in symptom analysis and health guidance. 

IMPORTANT GUIDELINES:
- Provide accurate, helpful medical information based on symptoms
- Always recommend consulting healthcare professionals for diagnosis
- Identify potential conditions but never provide definitive diagnoses
- Suggest appropriate urgency levels (Low, Medium, High, Emergency)
- Include relevant next steps and recommendations
- Be empathetic and professional in your responses
- If symptoms suggest emergency conditions, clearly state "SEEK IMMEDIATE MEDICAL ATTENTION"

Your responses should be structured, informative, and focused on patient safety."""

        # Prepare comprehensive prompt
        user_context = ""
        if user_profile:
            user_context = f"Patient Context: Age: {user_profile.get('age', 'N/A')}, Gender: {user_profile.get('gender', 'N/A')}, Medical History: {user_profile.get('medical_history', [])}"
        
        full_prompt = f"""Medical Knowledge Base Context:
{context}

{user_context}

Patient Query: {message}

Please provide a comprehensive medical assessment including:
1. Possible conditions to consider
2. Recommended actions
3. Urgency level assessment
4. When to seek medical care
5. General health advice

Respond naturally and professionally without referencing the knowledge base directly."""

        # Prepare payload
        payload = {
            "model": "llama3-70b-8192",  # Using larger model for better medical responses
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": full_prompt
                }
            ],
            "temperature": 0.3,  # Lower temperature for more consistent medical responses
            "max_tokens": 1500
        }
        
        # Make the request
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        # Parse the response
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Groq API error: {e}")
        return "I apologize, but I'm experiencing technical difficulties. Please consult with a healthcare professional for your medical concerns."

def analyze_symptoms(symptoms_data: SymptomAnalysisModel):
    """Analyze symptoms and provide medical insights"""
    symptoms_text = ", ".join(symptoms_data.symptoms)
    context_query = f"symptoms: {symptoms_text} age: {symptoms_data.age} gender: {symptoms_data.gender}"
    
    # Retrieve relevant medical context
    context = retrieve_medical_context(context_query, top_k=7)
    
    # Create detailed query for analysis
    detailed_query = f"""
    Patient presents with the following symptoms: {symptoms_text}
    Age: {symptoms_data.age or 'Not specified'}
    Gender: {symptoms_data.gender or 'Not specified'}
    Duration: {symptoms_data.duration or 'Not specified'}
    Severity: {symptoms_data.severity or 'Not specified'}
    Medical History: {', '.join(symptoms_data.medical_history) if symptoms_data.medical_history else 'None reported'}
    
    Please provide a comprehensive symptom analysis.
    """
    
    # Generate medical response
    response = generate_medical_response(detailed_query, context)
    
    return response

@app.post("/chat")
async def medical_chat(query: QueryModel):
    """
    Process medical chat messages with translation and text-to-speech support.
    """
    try:
        # Detect language of input
        detected_lang = detect_language(query.message)
        
        # Translate to English for processing if needed
        english_message = query.message
        if detected_lang != 'en':
            try:
                translator = GoogleTranslator(source=detected_lang, target='en')
                english_message = translator.translate(query.message)
            except Exception as e:
                print(f"Translation error: {e}")
        
        # Retrieve medical context from health.txt
        context = retrieve_medical_context(english_message)
        
        # Generate medical response
        response_text = generate_medical_response(english_message, context)
        
        # Translate response back if needed
        final_response = response_text
        if detected_lang != 'en':
            try:
                translator = GoogleTranslator(source='en', target=detected_lang)
                final_response = translator.translate(response_text)
            except Exception as e:
                print(f"Response translation error: {e}")
                final_response = response_text
        
        # Convert to speech
        audio_filename = text_to_speech(final_response, detected_lang)
        
        return {
            "text_response": final_response,
            "english_response": response_text,
            "audio_file_path": audio_filename,
            "detected_language": detected_lang,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Medical chat error: {e}")
        return {
            "error": str(e),
            "text_response": "I apologize for the technical issue. Please consult a healthcare professional for medical advice.",
            "audio_file_path": None,
            "detected_language": "en"
        }

@app.post("/symptom-analysis")
async def symptom_analysis(symptoms: SymptomAnalysisModel):
    """
    Advanced symptom analysis endpoint
    """
    try:
        analysis_result = analyze_symptoms(symptoms)
        
        return {
            "analysis": analysis_result,
            "timestamp": datetime.now().isoformat(),
            "symptoms_analyzed": symptoms.symptoms,
            "recommendation": "Please consult with a healthcare professional for proper diagnosis and treatment."
        }
    except Exception as e:
        print(f"Symptom analysis error: {e}")
        return {
            "error": str(e),
            "analysis": "Unable to analyze symptoms at this time. Please consult a healthcare professional.",
            "timestamp": datetime.now().isoformat()
        }

@app.post("/voice-input")
async def process_medical_voice(file: UploadFile = File(...)):
    """
    Process medical voice input, transcribe, and generate a response.
    """
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    try:
        # Save uploaded audio file
        content = await file.read()
        temp_file.write(content)
        temp_file.close()

        # Initialize speech recognizer
        recognizer = sr.Recognizer()
        with sr.AudioFile(temp_file.name) as source:
            recognizer.adjust_for_ambient_noise(source, duration=1)
            audio = recognizer.record(source)
        
        # Attempt transcription with multiple languages
        transcribed_text = ""
        detected_lang = 'en'
        
        # Try different languages for transcription
        languages_to_try = ['en-US', 'hi-IN', 'es-ES', 'fr-FR']
        
        for lang in languages_to_try:
            try:
                transcribed_text = recognizer.recognize_google(audio, language=lang)
                detected_lang = lang.split('-')[0]
                break
            except:
                continue
        
        if not transcribed_text:
            raise Exception("Could not transcribe audio")

        # Retrieve medical context
        context = retrieve_medical_context(transcribed_text)

        # Generate medical response
        response_text = generate_medical_response(transcribed_text, context)
        
        # Translate if needed
        if detected_lang != 'en':
            try:
                translator = GoogleTranslator(source='en', target=detected_lang)
                response_text = translator.translate(response_text)
            except Exception as e:
                print(f"Translation error: {e}")

        # Convert to speech
        audio_filename = text_to_speech(response_text, detected_lang)

        return {
            "transcribed_text": transcribed_text,
            "text_response": response_text,
            "audio_file_path": audio_filename,
            "detected_language": detected_lang,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Voice processing error: {e}")
        return {
            "error": str(e),
            "text_response": "I couldn't process your voice input. Please try again or consult a healthcare professional.",
            "audio_file_path": None,
            "detected_language": "en"
        }
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file.name):
            os.unlink(temp_file.name)

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    """
    Retrieve audio files.
    """
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(str(file_path))

@app.post("/update-medical-database")
async def update_medical_database(file: UploadFile = File(...)):
    """
    Update the medical ChromaDB with a new health.txt file
    """
    try:
        # Save uploaded file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.txt')
        content = await file.read()
        temp_file.write(content)
        temp_file.close()

        # Reload database with new medical file
        global vectorstore
        vectorstore = load_and_store_medical_data(temp_file.name)

        # Clean up temporary file
        os.unlink(temp_file.name)

        return {"status": "Medical database updated successfully", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        print(f"Medical database update error: {e}")
        return {"error": str(e)}

@app.get("/health-check")
async def health_check():
    """
    Health check endpoint for the MediChain AI service
    """
    return {
        "status": "healthy",
        "service": "MediChain AI Chatbot",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def root():
    """
    Root endpoint with API information
    """
    return {
        "message": "Welcome to MediChain AI - Your AI-powered medical assistant",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/chat - Medical chat interface",
            "symptom_analysis": "/symptom-analysis - Advanced symptom analysis",
            "voice_input": "/voice-input - Voice-based medical queries",
            "health_check": "/health-check - Service health status"
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting MediChain AI Chatbot Service...")
    print(f"Medical data file: {HEALTH_DATA_FILE}")
    print(f"ChromaDB directory: {CHROMA_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=8000)