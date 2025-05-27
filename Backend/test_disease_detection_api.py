import os
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create a simple FastAPI app for testing
app = FastAPI(title="Disease Detection Test API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import the disease detection integration
try:
    from integrate_disease_detection import integrate_disease_detection
    success = integrate_disease_detection(app)
    if success:
        logger.info("Disease detection integration successful")
    else:
        logger.error("Disease detection integration failed")
except Exception as e:
    logger.error(f"Error importing disease detection integration: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Disease Detection API is running. Use /api/detect-disease-from-image endpoint to analyze medical images."}

# Run the server
if __name__ == "__main__":
    port = 8005  # Use a different port to avoid conflicts
    logger.info(f"Starting test server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)