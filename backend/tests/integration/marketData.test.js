const mongoose = require('mongoose');
const { request } = require('../setup');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { 
  getLatestMarketData, 
  generateSampleData 
} = require('../../services/marketDataService');

describe('Market Data Integration Tests', () => {
  let mongoServer;
  
  beforeAll(async () => {
    // Create in-memory MongoDB server for this test suite
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to integration test MongoDB');
  });
  
  afterAll(async () => {
    // Disconnect from database
    await mongoose.disconnect();
    
    // Stop in-memory server
    await mongoServer.stop();
    
    console.log('Disconnected from integration test MongoDB');
  });
  
  beforeEach(async () => {
    // Clear the database
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });
  
  test('should generate and retrieve market data', async () => {
    // Generate sample data for SPY
    await generateSampleData('SPY', 20);
    
    // Retrieve the data
    const data = await getLatestMarketData('SPY', 10);
    
    // Assertions
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(10);
    expect(data[0].symbol).toBe('SPY');
  });
  
  test('should retrieve market data via API', async () => {
    // Generate sample data for AAPL
    await generateSampleData('AAPL', 30);
    
    // Make API request
    const response = await request.get('/api/market?symbol=AAPL&limit=15');
    
    // Assertions
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(15);
    expect(response.body[0].symbol).toBe('AAPL');
  });
  
  test('should handle multiple symbols', async () => {
    // Generate sample data for multiple symbols
    await generateSampleData('SPY', 20);
    await generateSampleData('AAPL', 20);
    await generateSampleData('MSFT', 20);
    
    // Make API requests for different symbols
    const spy = await request.get('/api/market?symbol=SPY&limit=5');
    const aapl = await request.get('/api/market?symbol=AAPL&limit=5');
    const msft = await request.get('/api/market?symbol=MSFT&limit=5');
    
    // Assertions
    expect(spy.status).toBe(200);
    expect(aapl.status).toBe(200);
    expect(msft.status).toBe(200);
    
    expect(spy.body[0].symbol).toBe('SPY');
    expect(aapl.body[0].symbol).toBe('AAPL');
    expect(msft.body[0].symbol).toBe('MSFT');
  });
});