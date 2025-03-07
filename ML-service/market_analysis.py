# market_analysis.py - Modified to use only real data
import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout
import joblib
import json
import os
import requests
from datetime import datetime, timedelta
import talib  # Technical Analysis Library
from tensorflow.keras.utils import register_keras_serializable
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("market_analysis.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Register a custom metric (or loss function) so that it's available during model loading.
@register_keras_serializable(package="Custom", name="MyCustomMetric")
def custom_mse(y_true, y_pred):
    # Uses TensorFlow's built-in mean squared error.
    # Updated to work with newer TensorFlow versions
    return tf.reduce_mean(tf.square(y_true - y_pred))

# Constants
MODEL_PATH = 'models/price_prediction_model.h5'
SCALER_PATH = 'models/price_scaler.pkl'
LOOK_BACK = 60  # Number of time periods to look back for predictions

class MarketAnalyzer:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get('MARKET_API_KEY')
        self.model = None
        self.scaler = None
        
        # Try to load model on initialization
        try:
            self.load_model()
        except Exception as e:
            logger.warning(f"Could not load model on initialization: {e}")
    
    def fetch_historical_data(self, symbol='SPY', interval='5min', days=30):
        """Fetch historical market data for training and analysis from real API"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Use a real market data API
        url = f"https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol={symbol}&interval={interval}&outputsize=full&apikey={self.api_key}"
        
        try:
            logger.info(f"Fetching historical data for {symbol}...")
            response = requests.get(url, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"API error: Status code {response.status_code}")
                raise Exception(f"API returned status code {response.status_code}")
            
            data = response.json()
            
            time_series_key = f"Time Series ({interval})"
            if time_series_key not in data:
                # Print available error message or note from the API
                error_message = data.get("Error Message", data.get("Note", "Unexpected response format"))
                logger.error(f"Alpha Vantage response error: {error_message}")
                raise KeyError(f"Expected key {time_series_key} not found in API response")
            
            time_series = data[time_series_key]
            
            # Check if we have any data points
            if not time_series:
                logger.error("No data points returned from API")
                raise ValueError("No data points returned from API")
                
            df = pd.DataFrame.from_dict(time_series, orient='index')
            df.index = pd.to_datetime(df.index)
            df = df.sort_index()
            
            # Rename columns
            df.columns = ['open', 'high', 'low', 'close', 'volume']
            
            # Convert columns to numeric values
            for col in df.columns:
                df[col] = pd.to_numeric(df[col])
                
            # Filter by date range
            df = df[(df.index >= start_date) & (df.index <= end_date)]
            
            if len(df) == 0:
                logger.error(f"No data found for {symbol} in the specified date range")
                raise ValueError(f"No data found for {symbol} in the specified date range")
                
            logger.info(f"Successfully fetched {len(df)} data points for {symbol}")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching historical data: {e}")
            # Instead of generating mock data, raise the exception for proper handling
            raise
    
    def add_technical_indicators(self, df):
        """Add technical indicators to the dataframe"""
        try:
            # Make a copy to avoid issues
            df_copy = df.copy()
            
            # Check if we have enough data
            if len(df_copy) < 50:
                logger.warning(f"Insufficient data points ({len(df_copy)}) for all indicators. Using available data.")
            
            # Add indicators with error handling
            try:
                df_copy['sma_20'] = talib.SMA(df_copy['close'].values, timeperiod=min(20, len(df_copy) - 1))
            except Exception as e:
                logger.error(f"Error calculating SMA_20: {e}")
                df_copy['sma_20'] = np.nan
                
            try:
                df_copy['sma_50'] = talib.SMA(df_copy['close'].values, timeperiod=min(50, len(df_copy) - 1))
            except Exception as e:
                logger.error(f"Error calculating SMA_50: {e}")
                df_copy['sma_50'] = np.nan
                
            try:
                df_copy['ema_20'] = talib.EMA(df_copy['close'].values, timeperiod=min(20, len(df_copy) - 1))
            except Exception as e:
                logger.error(f"Error calculating EMA_20: {e}")
                df_copy['ema_20'] = np.nan
            
            try:
                macd, macdsignal, macdhist = talib.MACD(
                    df_copy['close'].values, 
                    fastperiod=min(12, len(df_copy) - 1), 
                    slowperiod=min(26, len(df_copy) - 1), 
                    signalperiod=min(9, len(df_copy) - 1)
                )
                df_copy['macd'] = macd
                df_copy['macd_signal'] = macdsignal
                df_copy['macd_hist'] = macdhist
            except Exception as e:
                logger.error(f"Error calculating MACD: {e}")
                df_copy['macd'] = np.nan
                df_copy['macd_signal'] = np.nan
                df_copy['macd_hist'] = np.nan
            
            try:
                df_copy['rsi'] = talib.RSI(df_copy['close'].values, timeperiod=min(14, len(df_copy) - 1))
            except Exception as e:
                logger.error(f"Error calculating RSI: {e}")
                df_copy['rsi'] = np.nan
            
            try:
                upper, middle, lower = talib.BBANDS(
                    df_copy['close'].values, 
                    timeperiod=min(20, len(df_copy) - 1), 
                    nbdevup=2, 
                    nbdevdn=2, 
                    matype=0
                )
                df_copy['bb_upper'] = upper
                df_copy['bb_middle'] = middle
                df_copy['bb_lower'] = lower
            except Exception as e:
                logger.error(f"Error calculating Bollinger Bands: {e}")
                df_copy['bb_upper'] = np.nan
                df_copy['bb_middle'] = np.nan
                df_copy['bb_lower'] = np.nan
            
            try:
                slowk, slowd = talib.STOCH(
                    df_copy['high'].values, 
                    df_copy['low'].values, 
                    df_copy['close'].values,
                    fastk_period=min(14, len(df_copy) - 1), 
                    slowk_period=min(3, len(df_copy) - 1), 
                    slowk_matype=0, 
                    slowd_period=min(3, len(df_copy) - 1), 
                    slowd_matype=0
                )
                df_copy['stoch_k'] = slowk
                df_copy['stoch_d'] = slowd
            except Exception as e:
                logger.error(f"Error calculating Stochastic: {e}")
                df_copy['stoch_k'] = np.nan
                df_copy['stoch_d'] = np.nan
            
            try:
                df_copy['atr'] = talib.ATR(
                    df_copy['high'].values, 
                    df_copy['low'].values, 
                    df_copy['close'].values, 
                    timeperiod=min(14, len(df_copy) - 1)
                )
            except Exception as e:
                logger.error(f"Error calculating ATR: {e}")
                df_copy['atr'] = np.nan
            
            try:
                df_copy['obv'] = talib.OBV(
                    df_copy['close'].astype('float64').values, 
                    df_copy['volume'].astype('float64').values
                )
            except Exception as e:
                logger.error(f"Error calculating OBV: {e}")
                df_copy['obv'] = np.nan
            
            # Forward fill NaN values
            df_copy = df_copy.ffill()
            
            # If there are still NaN values at the beginning of the dataframe, use backward fill
            df_copy = df_copy.bfill()
            
            return df_copy
            
        except Exception as e:
            logger.error(f"Error adding technical indicators: {e}")
            raise
    
    def prepare_data_for_lstm(self, df, target_col='close', look_back=LOOK_BACK):
        """Prepare the data for LSTM model training"""
        try:
            # Check that we have enough data points
            if len(df) < look_back + 20:
                logger.error(f"Insufficient data points ({len(df)}) for LSTM preparation. Need at least {look_back + 20}.")
                raise ValueError(f"Insufficient data points for LSTM preparation. Need at least {look_back + 20}.")
            
            # Calculate returns and target variables
            df['return'] = df[target_col].pct_change()
            df['return_volatility'] = df['return'].rolling(window=min(20, len(df) - 1)).std()
            
            # Forward prediction targets
            df['target_15min'] = df[target_col].pct_change(periods=3).shift(-3)
            df['target_30min'] = df[target_col].pct_change(periods=6).shift(-6)
            df['target_60min'] = df[target_col].pct_change(periods=12).shift(-12)
            
            # Drop rows with NaN values
            df = df.dropna()
            
            # Check that we still have enough data after dropping NaN values
            if len(df) < look_back:
                logger.error(f"Insufficient data points ({len(df)}) after dropping NaN values. Need at least {look_back}.")
                raise ValueError(f"Insufficient data points after dropping NaN values. Need at least {look_back}.")
            
            # Define features to use for prediction
            features = [
                'open', 'high', 'low', 'close', 'volume', 
                'sma_20', 'sma_50', 'ema_20', 
                'macd', 'macd_signal', 'macd_hist', 
                'rsi', 'bb_upper', 'bb_middle', 'bb_lower',
                'stoch_k', 'stoch_d', 'atr', 'return', 'return_volatility'
            ]
            
            # Scale the features
            scaler = MinMaxScaler(feature_range=(0, 1))
            scaled_data = scaler.fit_transform(df[features])
            self.scaler = scaler
            
            # Save the scaler for later use
            os.makedirs(os.path.dirname(SCALER_PATH), exist_ok=True)
            joblib.dump(scaler, SCALER_PATH)
            
            # Create sequences for LSTM
            X, y = [], []
            for i in range(look_back, len(scaled_data)):
                X.append(scaled_data[i-look_back:i])
                y.append(df[['target_15min', 'target_30min', 'target_60min']].iloc[i].values)
            
            X, y = np.array(X), np.array(y)
            
            # Split into training and testing sets
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
            
            logger.info(f"Prepared {len(X_train)} training sequences and {len(X_test)} testing sequences")
            return X_train, X_test, y_train, y_test, features
            
        except Exception as e:
            logger.error(f"Error preparing data for LSTM: {e}")
            raise
    
    def build_lstm_model(self, input_shape, output_shape=3):
        """Build an LSTM model for time series prediction"""
        try:
            model = Sequential()
            model.add(LSTM(100, return_sequences=True, input_shape=input_shape))
            model.add(Dropout(0.2))
            model.add(LSTM(50, return_sequences=False))
            model.add(Dropout(0.2))
            model.add(Dense(25))
            model.add(Dense(output_shape))
            model.compile(optimizer='adam', loss=custom_mse)
            
            logger.info(f"Built LSTM model with input shape {input_shape} and output shape {output_shape}")
            return model
            
        except Exception as e:
            logger.error(f"Error building LSTM model: {e}")
            raise
    
    def train_model(self, epochs=50, batch_size=32):
        """Train the LSTM model on real market data"""
        try:
            logger.info("Fetching and preparing data for model training...")
            
            # Fetch real market data
            df = self.fetch_historical_data()
            
            # Add technical indicators
            df = self.add_technical_indicators(df)
            
            # Prepare data for LSTM
            X_train, X_test, y_train, y_test, features = self.prepare_data_for_lstm(df)
            
            logger.info(f"Building model with input shape: {X_train.shape[1:]}")
            model = self.build_lstm_model(input_shape=(X_train.shape[1], X_train.shape[2]))
            
            logger.info(f"Training model with {len(X_train)} samples...")
            history = model.fit(
                X_train, y_train,
                epochs=epochs,
                batch_size=batch_size,
                validation_data=(X_test, y_test),
                verbose=1
            )
            
            # Save the trained model
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            model.save(MODEL_PATH)
            
            self.model = model
            
            # Log training results
            train_loss = history.history['loss'][-1]
            val_loss = history.history['val_loss'][-1]
            logger.info(f"Model training completed. Final training loss: {train_loss}, validation loss: {val_loss}")
            
            return model, features
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            raise
    
    def load_model(self):
        """Load a pre-trained model and scaler"""
        try:
            if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
                logger.info("Loading pre-trained model and scaler...")
                self.model = load_model(MODEL_PATH, custom_objects={'custom_mse': custom_mse})
                self.scaler = joblib.load(SCALER_PATH)
                logger.info("Successfully loaded pre-trained model and scaler")
                return True
            else:
                logger.warning("No pre-trained model or scaler found")
                return False
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def predict_future_prices(self, current_data, look_forward_periods=[3, 6, 12]):
        """Predict future prices using the trained model and real market data"""
        try:
            # Check if we have a trained model
            if self.model is None:
                if not self.load_model():
                    logger.info("No trained model found. Training a new one...")
                    self.train_model(epochs=50)  # Use more epochs for better prediction
            
            # Check if we have enough data
            if len(current_data) < LOOK_BACK:
                logger.error(f"Insufficient data for prediction. Need at least {LOOK_BACK} data points, but got {len(current_data)}.")
                raise ValueError(f"Insufficient data for prediction. Need at least {LOOK_BACK} data points.")
            
            # Add technical indicators
            current_data = self.add_technical_indicators(current_data)
            
            # Ensure we have the required features
            features = [
                'open', 'high', 'low', 'close', 'volume', 
                'sma_20', 'sma_50', 'ema_20', 
                'macd', 'macd_signal', 'macd_hist', 
                'rsi', 'bb_upper', 'bb_middle', 'bb_lower',
                'stoch_k', 'stoch_d', 'atr', 'return', 'return_volatility'
            ]
            
            # Calculate return and volatility
            current_data['return'] = current_data['close'].pct_change()
            current_data['return_volatility'] = current_data['return'].rolling(window=min(20, len(current_data) - 1)).std()
            
            # Forward fill any NaN values
            current_data = current_data.ffill().bfill()
            
            # Prepare the input for prediction
            scaled_data = self.scaler.transform(current_data[features].iloc[-LOOK_BACK:].values)
            X_test = np.array([scaled_data])
            
            # Make prediction
            predictions = self.model.predict(X_test)
            
            # Get the last price
            last_price = current_data['close'].iloc[-1]
            
            # Convert predictions to future prices
            future_prices = {}
            time_labels = ['15min', '30min', '60min']
            
            for i, period in enumerate(look_forward_periods):
                if i < len(predictions[0]):
                    predicted_change = predictions[0][i]
                    future_price = last_price * (1 + predicted_change)
                    future_prices[time_labels[i]] = future_price
            
            logger.info(f"Predicted future prices: {future_prices}")
            return future_prices
            
        except Exception as e:
            logger.error(f"Error predicting future prices: {e}")
            raise
    
    def analyze_market_sentiment(self, data, lookback_period=14):
        """Analyze market sentiment based on technical indicators"""
        try:
            # Add technical indicators to the data
            df = self.add_technical_indicators(data.copy())
            
            # Use only the most recent data
            df = df.iloc[-lookback_period:]
            
            if len(df) < lookback_period:
                logger.warning(f"Sentiment analysis using {len(df)} data points instead of requested {lookback_period}")
            
            # Calculate various sentiment signals
            sentiment_signals = {
                'rsi_bullish': (df['rsi'] < 30).sum() / len(df),
                'rsi_bearish': (df['rsi'] > 70).sum() / len(df),
                'macd_bullish': (df['macd'] > df['macd_signal']).sum() / len(df),
                'macd_bearish': (df['macd'] < df['macd_signal']).sum() / len(df),
                'ma_bullish': (df['close'] > df['sma_50']).sum() / len(df),
                'ma_bearish': (df['close'] < df['sma_50']).sum() / len(df),
                'bb_bullish': (df['close'] < df['bb_lower']).sum() / len(df),
                'bb_bearish': (df['close'] > df['bb_upper']).sum() / len(df),
                'stoch_bullish': ((df['stoch_k'] < 20) & (df['stoch_k'] > df['stoch_d'])).sum() / len(df),
                'stoch_bearish': ((df['stoch_k'] > 80) & (df['stoch_k'] < df['stoch_d'])).sum() / len(df),
            }
            
            # Calculate overall bullish and bearish scores
            bullish_score = sum([
                sentiment_signals['rsi_bullish'],
                sentiment_signals['macd_bullish'],
                sentiment_signals['ma_bullish'],
                sentiment_signals['bb_bullish'],
                sentiment_signals['stoch_bullish']
            ]) / 5
            
            bearish_score = sum([
                sentiment_signals['rsi_bearish'],
                sentiment_signals['macd_bearish'],
                sentiment_signals['ma_bearish'],
                sentiment_signals['bb_bearish'],
                sentiment_signals['stoch_bearish']
            ]) / 5
            
            # Calculate overall sentiment score
            sentiment_score = bullish_score - bearish_score
            
            # Determine sentiment category
            if sentiment_score < -0.6:
                sentiment = "Bearish"
            elif sentiment_score < -0.2:
                sentiment = "Slightly Bearish"
            elif sentiment_score < 0.2:
                sentiment = "Neutral"
            elif sentiment_score < 0.6:
                sentiment = "Slightly Bullish"
            else:
                sentiment = "Bullish"
            
            logger.info(f"Market sentiment analysis: {sentiment} with score {sentiment_score:.2f}")
            
            return {
                'sentiment': sentiment,
                'score': sentiment_score,
                'indicators': sentiment_signals
            }
            
        except Exception as e:
            logger.error(f"Error analyzing market sentiment: {e}")
            raise
    
    def identify_top_movers(self, symbols=['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'], interval='1day'):
        """Identify top market movers based on actual market data"""
        try:
            results = []
            for symbol in symbols:
                try:
                    # Fetch the actual data for this symbol
                    url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={self.api_key}"
                    response = requests.get(url, timeout=10)
                    
                    if response.status_code != 200:
                        logger.warning(f"Failed to fetch data for {symbol}: API returned status code {response.status_code}")
                        continue
                    
                    data = response.json()
                    
                    if 'Global Quote' not in data:
                        logger.warning(f"Unexpected response format for {symbol}: {data}")
                        continue
                    
                    quote = data['Global Quote']
                    price = float(quote.get('05. price', 0))
                    change_pct = float(quote.get('10. change percent', '0%').replace('%', ''))
                    
                    results.append({
                        'symbol': symbol,
                        'change': change_pct
                    })
                    
                except Exception as e:
                    logger.error(f"Error fetching data for {symbol}: {e}")
            
            # Sort by absolute change
            results.sort(key=lambda x: abs(x['change']), reverse=True)
            logger.info(f"Identified top movers: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Error identifying top movers: {e}")
            raise
    
    def generate_alerts(self, df):
        """Generate market alerts based on technical analysis of real data"""
        try:
            # Ensure we have technical indicators
            df = self.add_technical_indicators(df.copy())
            
            alerts = []
            
            # Check for various alert conditions
            try:
                recent_volatility = df['close'].pct_change().rolling(window=min(20, len(df) - 1)).std().iloc[-1]
                historical_volatility = df['close'].pct_change().rolling(window=min(20, len(df) - 1)).std().mean()
                
                if recent_volatility > historical_volatility * 1.5:
                    alerts.append("Unusual price volatility detected")
            except Exception as e:
                logger.warning(f"Error calculating volatility alert: {e}")
            
            try:
                recent_volume = df['volume'].iloc[-1]
                avg_volume = df['volume'].rolling(window=min(20, len(df) - 1)).mean().iloc[-1]
                
                if recent_volume > avg_volume * 2:
                    alerts.append("Unusual volume spike detected")
            except Exception as e:
                logger.warning(f"Error calculating volume alert: {e}")
            
            try:
                if len(df) >= 3 and 'macd' in df.columns and 'macd_signal' in df.columns:
                    if df['macd'].iloc[-2] < df['macd_signal'].iloc[-2] and df['macd'].iloc[-1] > df['macd_signal'].iloc[-1]:
                        alerts.append("MACD bullish crossover detected")
                    elif df['macd'].iloc[-2] > df['macd_signal'].iloc[-2] and df['macd'].iloc[-1] < df['macd_signal'].iloc[-1]:
                        alerts.append("MACD bearish crossover detected")
            except Exception as e:
                logger.warning(f"Error calculating MACD alert: {e}")
            
            try:
                if 'rsi' in df.columns:
                    if df['rsi'].iloc[-1] < 30:
                        alerts.append("RSI indicates oversold conditions")
                    elif df['rsi'].iloc[-1] > 70:
                        alerts.append("RSI indicates overbought conditions")
            except Exception as e:
                logger.warning(f"Error calculating RSI alert: {e}")
            
            try:
                if len(df) >= 3 and 'sma_20' in df.columns and 'sma_50' in df.columns:
                    if df['sma_20'].iloc[-2] < df['sma_50'].iloc[-2] and df['sma_20'].iloc[-1] > df['sma_50'].iloc[-1]:
                        alerts.append("Bullish moving average crossover (20 over 50)")
                    elif df['sma_20'].iloc[-2] > df['sma_50'].iloc[-2] and df['sma_20'].iloc[-1] < df['sma_50'].iloc[-1]:
                        alerts.append("Bearish moving average crossover (50 over 20)")
            except Exception as e:
                logger.warning(f"Error calculating MA crossover alert: {e}")
            
            logger.info(f"Generated {len(alerts)} market alerts")
            return alerts
            
        except Exception as e:
            logger.error(f"Error generating alerts: {e}")
            raise

# If this file is run directly, test the functionality
if __name__ == "__main__":
    try:
        analyzer = MarketAnalyzer()
        logger.info("Testing MarketAnalyzer functionality...")
        
        # Try to load or train a model
        if not analyzer.load_model():
            logger.info("Training a new model...")
            try:
                data = analyzer.fetch_historical_data()
                logger.info(f"Fetched {len(data)} data points")
                
                data = analyzer.add_technical_indicators(data)
                
                model, features = analyzer.train_model(epochs=5)  # Quick training for testing
                
                future_prices = analyzer.predict_future_prices(data)
                logger.info(f"Predicted prices: {future_prices}")
                
                sentiment = analyzer.analyze_market_sentiment(data)
                logger.info(f"Market sentiment: {sentiment['sentiment']}")
                
                alerts = analyzer.generate_alerts(data)
                if alerts:
                    logger.info(f"Alerts: {alerts}")
                else:
                    logger.info("No alerts triggered")
            except Exception as e:
                logger.error(f"Error in MarketAnalyzer test: {e}")
        else:
            logger.info("Model successfully loaded")
    except Exception as e:
        logger.error(f"Error initializing MarketAnalyzer: {e}")
