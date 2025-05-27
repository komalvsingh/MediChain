import os
import sys
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def integrate_disease_detection(app):
    """
    Integrate the disease detection functionality with the existing FastAPI app.
    This function should be called from symptoms.py to add the disease detection endpoint.
    """
    try:
        # First try to import from the compatibility-enhanced version
        try:
            from image_disease_detection_compat import create_disease_detection_api
            logger.info("Using compatibility-enhanced disease detection module")
        except ImportError:
            # Fall back to the original module if the compat version is not available
            from image_disease_detection import create_disease_detection_api
            logger.info("Using standard disease detection module")
        
        # Create the disease detection API endpoint
        create_disease_detection_api(app)
        
        logger.info("Disease detection endpoint added to FastAPI app")
        return True
    
    except Exception as e:
        logger.error(f"Failed to integrate disease detection: {str(e)}")
        return False

# For testing purposes
if __name__ == "__main__":
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI()
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Integrate disease detection
    success = integrate_disease_detection(app)
    
    if success:
        print("Disease detection integrated successfully. Run the FastAPI server to test.")
    else:
        print("Failed to integrate disease detection.")