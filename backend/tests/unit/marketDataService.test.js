const {
    generateSampleData,
    getLatestMarketData,
    fetchHistoricalData,
    getMarketSummary
  } = require('../../services/marketDataService');
  
  // Mock MongoDB model
  jest.mock('mongoose', () => {
    const mockModel = {
      find: jest.fn(() => mockModel),
      findOne: jest.fn(() => mockModel),
      sort: jest.fn(() => mockModel),
      limit: jest.fn(() => mockModel),
      lean: jest.fn(() => mockModel),
      exec: jest.fn(),
      insertMany: jest.fn(),
      save: jest.fn()
    };
    
    return {
      Schema: jest.fn(),
      model: jest.fn(() => mockModel),
      models: { MarketData: mockModel },
      connection: {
        readyState: 1
      }
    };
  });
  
  describe('Market Data Service Unit Tests', () => {
    const mockMarketData = [
      {
        symbol: 'SPY',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        open: 100,
        high: 101,
        low: 99,
        close: 100.5,
        volume: 10000
      },
      {
        symbol: 'SPY',
        timestamp: new Date('2023-01-01T12:05:00Z'),
        open: 100.5,
        high: 102,
        low: 100,
        close: 101.5,
        volume: 12000
      }
    ];
    
    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
      
      // Set up default mock returns
      const mongoose = require('mongoose');
      mongoose.models.MarketData.find().exec.mockResolvedValue(mockMarketData);
      mongoose.models.MarketData.findOne().exec.mockResolvedValue(mockMarketData[0]);
    });
    
    test('getLatestMarketData should retrieve and reverse data', async () => {
      const mongoose = require('mongoose');
      
      // Call the function
      const result = await getLatestMarketData('SPY', 10);
      
      // Verify MongoDB queries
      expect(mongoose.models.MarketData.find).toHaveBeenCalled();
      expect(mongoose.models.MarketData.sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(mongoose.models.MarketData.limit).toHaveBeenCalledWith(10);
      
      // Verify result is reversed data
      expect(result).toEqual(mockMarketData.reverse());
    });
    
    test('fetchHistoricalData should return appropriate data points for period', async () => {
      // Mock the getLatestMarketData function
      jest.spyOn(require('../../services/marketDataService'), 'getLatestMarketData')
        .mockResolvedValue(mockMarketData);
      
      // Call function with different periods
      const day = await fetchHistoricalData('SPY', '1d');
      const week = await fetchHistoricalData('SPY', '1w');
      const month = await fetchHistoricalData('SPY', '1m');
      
      // Verify correct number of points requested
      expect(getLatestMarketData).toHaveBeenCalledWith('SPY', 75);
      expect(getLatestMarketData).toHaveBeenCalledWith('SPY', 390);
      expect(getLatestMarketData).toHaveBeenCalledWith('SPY', 1680);
    });
    
    // Additional unit tests would go here...
  });