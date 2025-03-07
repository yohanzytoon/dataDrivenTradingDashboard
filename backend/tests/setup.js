const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const supertest = require('supertest');
const app = require('../server');

let mongoServer;

// Setup before tests
beforeAll(async () => {
  // Create in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  console.log('Connected to in-memory MongoDB');
});

// Cleanup after tests
afterAll(async () => {
  // Disconnect from database
  await mongoose.disconnect();
  
  // Stop in-memory server
  await mongoServer.stop();
  
  console.log('Disconnected from in-memory MongoDB');
});

// Clear database between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Export supertest request object
const request = supertest(app);
module.exports = { request };

// tests/marketRoutes.test.js - Market routes tests
const { request } = require('./setup');
const { getLatestMarketData } = require('../services/marketDataService');

// Mock market data service
jest.mock('../services/marketDataService', () => ({
  getLatestMarketData: jest.fn(),
  fetchHistoricalData: jest.fn(),
  getMarketSummary: jest.fn(),
  fetchTopMovers: jest.fn(),
  searchSymbols: jest.fn(),
  getSymbolNews: jest.fn()
}));

describe('Market API Routes', () => {
  // Generate sample market data
  const generateSampleData = (symbol, count) => {
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now.getTime() - (count - i) * 5 * 60000);
      const price = 100 + Math.sin(i / 10) * 5;
      
      data.push({
        symbol,
        timestamp,
        open: price - 0.5,
        high: price + 1,
        low: price - 1,
        close: price,
        volume: 10000 + Math.floor(Math.random() * 10000)
      });
    }
    
    return data;
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();
  });
  
  describe('GET /api/market', () => {
    test('should return market data for a symbol', async () => {
      // Mock the service response
      const mockData = generateSampleData('SPY', 10);
      getLatestMarketData.mockResolvedValue(mockData);
      
      // Make the request
      const response = await request.get('/api/market?symbol=SPY&limit=10');
      
      // Assertions
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(10);
      expect(response.body[0].symbol).toBe('SPY');
      
      // Verify service was called with correct params
      expect(getLatestMarketData).toHaveBeenCalledWith('SPY', 10);
    });
    
    test('should handle error when no data is available', async () => {
      // Mock service to return empty data
      getLatestMarketData.mockResolvedValue([]);
      
      // Make the request
      const response = await request.get('/api/market?symbol=INVALID&limit=10');
      
      // Assertions
      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });
    
    test('should handle service errors', async () => {
      // Mock service to throw an error
      getLatestMarketData.mockRejectedValue(new Error('Database error'));
      
      // Make the request
      const response = await request.get('/api/market?symbol=SPY&limit=10');
      
      // Assertions
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
    
    test('should validate input parameters', async () => {
      // Make request with invalid params
      const response = await request.get('/api/market?symbol=TOOLONG12345&limit=1000');
      
      // Assertions
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });
  
  // Additional market routes tests would go here...
});