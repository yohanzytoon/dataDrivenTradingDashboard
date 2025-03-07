# main.py - Improved error handling
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import pandas as pd
import numpy as np
import traceback
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from market_analysis import MarketAnalyzer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("api.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Market Prediction API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the MarketAnalyzer instance
analyzer = MarketAnalyzer()

# Define the expected request body using Pydantic with validation
class MarketDataPoint(BaseModel):
    symbol: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    source: Optional[str] = None
    indicators: Optional[Dict[str, float]] = None

    class Config:
        schema_extra = {
            "example": {
                "symbol": "SPY",
                "timestamp": "2023-09-15T14:30:00Z",
                "open": 443.21,
                "high": 445.67,
                "low": 442.89,
                "close": 444.23,
                "volume": 3456789,
                "source": "ALPHA_VANTAGE",
                "indicators": {
                    "sma20": 442.5,
                    "rsi": 65.3
                }
            }
        }

class PredictRequest(BaseModel):
    symbol: str = Field(default="SPY", description="Stock symbol to predict")
    days: int = Field(default=30, description="Number of days of historical data to consider", ge=1, le=365)
    marketData: List[Dict[str, Any]] = Field(..., description="List of market data points")

    @validator('marketData')
    def validate_market_data(cls, v):
        if not v or len(v) < 30:
            raise ValueError("At least 30 market data points are required for prediction")
        return v

# Error handler middleware
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        logger.error(traceback.format_exc())
        
        error_response = {
            "error": "Internal server error",
            "detail": str(e),
            "timestamp": datetime.now().isoformat()
        }
        
        # In production, you might want to hide the detailed error message
        return JSONResponse(
            status_code=500,
            content=error_response
        )

@app.post("/predict")
async def predict(request: PredictRequest):
    logger.info(f"Received prediction request for {request.symbol}")
    
    try:
        # Convert the provided marketData to a pandas DataFrame
        data = pd.DataFrame(request.marketData)
        
        # Ensure that timestamps are converted properly
        if "timestamp" in data.columns:
            data["timestamp"] = pd.to_datetime(data["timestamp"])
            
        # Check for missing values in critical columns
        critical_columns = ['open', 'high', 'low', 'close', 'volume']
        missing_data = False
        
        for col in critical_columns:
            if col not in data.columns:
                missing_data = True
                logger.error(f"Missing critical column: {col}")
            elif data[col].isnull().any():
                missing_data = True
                logger.error(f"Null values found in column: {col}")
        
        if missing_data:
            raise HTTPException(
                status_code=400, 
                detail="Market data contains missing or invalid values in critical columns"
            )
        
        # Call the prediction function
        predictions = analyzer.predict_future_prices(data)
        
        # Validate the predictions
        if not predictions or len(predictions) == 0:
            raise HTTPException(
                status_code=500,
                detail="Model failed to generate predictions"
            )
        
        logger.info(f"Successfully generated predictions for {request.symbol}")
        
        # Return predictions with additional metadata
        return {
            "symbol": request.symbol,
            "predictions": predictions,
            "timestamp": datetime.now().isoformat(),
            "model_version": "1.0.0"
        }
        
    except Exception as e:
        logger.error(f"Error in prediction: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Check if this is already an HTTPException
        if isinstance(e, HTTPException):
            raise e
        
        # Otherwise create a new one
        raise HTTPException(
            status_code=500,
            detail=f"Error generating predictions: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": analyzer.model is not None
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5002, reload=True)
