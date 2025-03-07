# Trading Dashboard

A comprehensive trading dashboard application for real-time market data visualization, technical analysis, and machine learning-based price predictions.


## Project Overview

This project consists of three main components:

1. **Backend (Node.js/Express)**: REST API for market data, analysis, and user management
2. **Frontend (React)**: Interactive user interface with charts and real-time updates
3. **ML Service (Python/FastAPI)**: Machine learning service for price predictions

## Features

- Real-time market data visualization
- Technical analysis indicators (RSI, MACD, Moving Averages)
- Machine learning price predictions
- Market sentiment analysis
- Customizable watchlists
- User authentication and profile management
- Responsive design for desktop and mobile

## Tech Stack

### Backend
- Node.js & Express
- MongoDB for data storage
- Socket.io for real-time updates
- JWT authentication

### Frontend
- React
- Recharts for data visualization
- Tailwind CSS for styling
- Lucide React for icons

### ML Service
- Python
- FastAPI
- TensorFlow/Keras for ML models
- Alpha Vantage API integration (optional)

## Getting Started

### Prerequisites
- Node.js (v14.x or higher)
- npm (v6.x or higher) or yarn
- Python (v3.8 or higher)
- MongoDB (v4.4 or higher)

### Installation & Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/trading-dashboard.git
cd trading-dashboard
```

#### 2. Set Up MongoDB
```bash
# Create a directory for MongoDB data
mkdir -p ~/data/db

# Start MongoDB
mongod --dbpath=~/data/db
```

Alternatively, use Docker:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### 3. Backend Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env file with your configuration

# Start the server
npm run dev
```

#### 4. ML Service Setup
```bash
# Navigate to ML service directory
cd ../ml-service

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env file with your configuration

# Train the model (optional - sample model included)
python -c "from market_analysis import MarketAnalyzer; analyzer = MarketAnalyzer(); analyzer.train_model(epochs=20)"

# Start the service
python main.py
```

#### 5. Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env file with your configuration

# Start the development server
npm start
```

### Environment Variables

Each component requires specific environment variables. Example files (.env.example) are provided in each directory.

## Data Sources

The application can use different data sources:

1. **Simulated Data**: Default mode, generates realistic market data patterns
2. **Alpha Vantage API**: For real market data (requires API key)
3. **Custom Data Source**: Can be configured in the backend

To use real market data with Alpha Vantage:
1. Get an API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Add your key to both backend and ML service .env files
3. Set `USE_REAL_DATA=true` in the backend .env file


## API Documentation

### Backend API Endpoints

- `GET /api/market`: Get latest market data
- `GET /api/market/historical`: Get historical market data
- `GET /api/market/ohlc`: Get OHLC data for candlestick charts
- `GET /api/analysis/sentiment`: Get market sentiment analysis
- `GET /api/analysis/metrics`: Get trading metrics
- `GET /api/analysis/technical`: Get technical indicators
- `POST /api/prediction`: Get price predictions

Complete API documentation is available at `/api-docs` when running the backend server.

## Deployment

### Docker Deployment
Docker configuration is provided for easy deployment:

```bash
# Build and start all services
docker-compose up -d
```

### Manual Deployment
For manual deployment:

1. Set up MongoDB on your server
2. Deploy the backend Node.js application
3. Deploy the ML service Python application
4. Build and deploy the React frontend

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
