// services/userService.js - User authentication and preferences service
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure logging
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, service }) => {
          return `${timestamp} [${service}] ${level}: ${message}`;
        })
      )
    }),
    new transports.File({ 
      filename: path.join(logsDir, 'users-error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new transports.File({ 
      filename: path.join(logsDir, 'users.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Environment variables with defaults
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// User schema for MongoDB
const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: { 
    type: String, 
    required: true,
    minlength: 8
  },
  firstName: { 
    type: String, 
    trim: true 
  },
  lastName: { 
    type: String, 
    trim: true 
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  preferences: {
    theme: { 
      type: String, 
      enum: ['light', 'dark', 'system'], 
      default: 'system' 
    },
    defaultSymbols: {
      type: [String],
      default: ['SPY', 'AAPL', 'MSFT'],
      validate: {
        validator: function(v) {
          return v.length <= 10;
        },
        message: props => `Maximum 10 default symbols allowed`
      }
    },
    refreshInterval: {
      type: Number,
      default: 60,
      min: 30,
      max: 300
    },
    chartType: {
      type: String,
      enum: ['line', 'candlestick', 'area'],
      default: 'line'
    },
    notifications: {
      enabled: {
        type: Boolean,
        default: true
      },
      priceAlerts: {
        type: Boolean,
        default: true
      },
      newsAlerts: {
        type: Boolean,
        default: true
      }
    }
  },
  watchlists: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    symbols: [String]
  }],
  refreshToken: String,
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it's modified or new
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt with 12 rounds
    const salt = await bcrypt.genSalt(12);
    
    // Hash password with salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password validity
UserSchema.methods.isValidPassword = async function(password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

// Method to generate access token
UserSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

// Method to generate refresh token
UserSchema.methods.generateRefreshToken = function() {
  // Create a refresh token
  const refreshToken = jwt.sign(
    { id: this._id },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  
  // Save refresh token to user
  this.refreshToken = refreshToken;
  
  return refreshToken;
};

// Create or get the User model
const User = mongoose.models.User || mongoose.model('User', UserSchema);

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} - User object and auth tokens
 */
async function registerUser(userData) {
  try {
    const { email, password, firstName, lastName } = userData;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName
    });
    
    // Save user
    await user.save();
    
    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    // Save refresh token
    user.lastLogin = new Date();
    await user.save();
    
    logger.info(`New user registered: ${email}`);
    
    // Return user and tokens
    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        preferences: user.preferences
      },
      accessToken,
      refreshToken
    };
  } catch (error) {
    logger.error(`Error registering user: ${error.message}`);
    throw error;
  }
}

/**
 * Login a user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} - User object and auth tokens
 */
async function loginUser(email, password) {
  try {
    // Find user
    const user = await User.findOne({ email, active: true });
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Check password
    const isValid = await user.isValidPassword(password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }
    
    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    // Update login timestamp
    user.lastLogin = new Date();
    await user.save();
    
    logger.info(`User logged in: ${email}`);
    
    // Return user and tokens
    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        preferences: user.preferences
      },
      accessToken,
      refreshToken
    };
  } catch (error) {
    logger.error(`Error logging in user: ${error.message}`);
    throw error;
  }
}

/**
 * Refresh auth tokens
 * @param {string} refreshToken - Current refresh token
 * @returns {Object} - New auth tokens
 */
async function refreshTokens(refreshToken) {
  try {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }
    
    // Verify refresh token
    let decodedToken;
    try {
      decodedToken = jwt.verify(refreshToken, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
    
    // Find user by ID and check if the refresh token matches
    const user = await User.findOne({ 
      _id: decodedToken.id, 
      refreshToken,
      active: true
    });
    
    if (!user) {
      throw new Error('Invalid refresh token');
    }
    
    // Generate new tokens
    const accessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();
    
    // Save new refresh token
    await user.save();
    
    logger.info(`Tokens refreshed for user: ${user.email}`);
    
    // Return new tokens
    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    logger.error(`Error refreshing tokens: ${error.message}`);
    throw error;
  }
}

/**
 * Get user profile
 * @param {string} userId - User ID
 * @returns {Object} - User profile
 */
async function getUserProfile(userId) {
  try {
    // Find user by ID
    const user = await User.findById(userId).select('-password -refreshToken');
    
    if (!user || !user.active) {
      throw new Error('User not found');
    }
    
    // Return user profile
    return user;
  } catch (error) {
    logger.error(`Error getting user profile: ${error.message}`);
    throw error;
  }
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Object} - Updated user profile
 */
async function updateUserProfile(userId, updates) {
  try {
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user || !user.active) {
      throw new Error('User not found');
    }
    
    // Check which fields are being updated
    const allowedUpdates = ['firstName', 'lastName', 'email'];
    
    // Apply updates
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    });
    
    // Save user
    await user.save();
    
    logger.info(`User profile updated: ${user.email}`);
    
    // Return updated user (excluding sensitive fields)
    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      preferences: user.preferences
    };
  } catch (error) {
    logger.error(`Error updating user profile: ${error.message}`);
    throw error;
  }
}

/**
 * Update user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {boolean} - Success indicator
 */
async function updateUserPassword(userId, currentPassword, newPassword) {
  try {
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user || !user.active) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isValid = await user.isValidPassword(currentPassword);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Update password
    user.password = newPassword;
    
    // Invalidate tokens by changing refresh token
    user.refreshToken = undefined;
    
    // Save user
    await user.save();
    
    logger.info(`Password updated for user: ${user.email}`);
    
    return true;
  } catch (error) {
    logger.error(`Error updating password: ${error.message}`);
    throw error;
  }
}

/**
 * Get user preferences
 * @param {string} userId - User ID
 * @returns {Object} - User preferences
 */
async function getUserPreferences(userId) {
  try {
    // Find user by ID and return only preferences
    const user = await User.findById(userId).select('preferences');
    
    if (!user || !user.active) {
      throw new Error('User not found');
    }
    
    return user.preferences;
  } catch (error) {
    logger.error(`Error getting user preferences: ${error.message}`);
    throw error;
  }
}

/**
 * Update user preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - Updated preferences
 * @returns {Object} - Updated preferences
 */
async function updateUserPreferences(userId, preferences) {
  try {
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user || !user.active) {
      throw new Error('User not found');
    }
    
    // Update preferences
    // We use Object.assign to update only provided fields
    Object.assign(user.preferences, preferences);
    
    // Save user
    await user.save();
    
    logger.info(`Preferences updated for user: ${user.email}`);
    
    return user.preferences;
  } catch (error) {
    logger.error(`Error updating preferences: ${error.message}`);
    throw error;
  }
}

/**
 * Get user watchlists
 * @param {string} userId - User ID
 * @returns {Array} - User watchlists
 */
async function getUserWatchlists(userId) {
  try {
    // Find user by ID and return only watchlists
    const user = await User.findById(userId).select('watchlists');
    
    if (!user || !user.active) {
      throw new Error('User not found');
    }
    
    return user.watchlists;
  } catch (error) {
    logger.error(`Error getting user watchlists: ${error.message}`);
    throw error;
  }
}

/**
 * Create a new watchlist
 * @param {string} userId - User ID
 * @param {string} name - Watchlist name
 * @param {Array} symbols - Watchlist symbols
 * @returns {Object} - Created watchlist
 */
async function createWatchlist(userId, name, symbols = []) {
  try {
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user || !user.active) {
      throw new Error('User not found');
    }
    
    // Check if watchlist name already exists
    const exists = user.watchlists.some(w => w.name === name);
    if (exists) {
      throw new Error('Watchlist with this name already exists');
    }
    
    // Create new watchlist
    const watchlist = {
      name,
      symbols: symbols.slice(0, 50) // Limit to 50 symbols per watchlist
    };
    
    // Add to user's watchlists
    user.watchlists.push(watchlist);
    
    // Save user
    await user.save();
    
    logger.info(`Watchlist "${name}" created for user: ${user.email}`);
    
    return watchlist;
  } catch (error) {
    logger.error(`Error creating watchlist: ${error.message}`);
    throw error;
  }
}

/**
 * Update a watchlist
 * @param {string} userId - User ID
 * @param {string} watchlistId - Watchlist ID
 * @param {Object} updates - Watchlist updates
 * @returns {Object} - Updated watchlist
 */
async function updateWatchlist(userId, watchlistId, updates) {
  try {
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user || !user.active) {
      throw new Error('User not found');
    }
    
    // Find watchlist
    const watchlist = user.watchlists.id(watchlistId);
    if (!watchlist) {
      throw new Error('Watchlist not found');
    }
    
    // Update watchlist
    if (updates.name !== undefined) {
      // Check if new name already exists in other watchlists
      const nameExists = user.watchlists.some(w => 
        w._id.toString() !== watchlistId && w.name === updates.name
      );
      
      if (nameExists) {
        throw new Error('Watchlist with this name already exists');
      }
      
      watchlist.name = updates.name;
    }
    
    if (updates.symbols !== undefined) {
      watchlist.symbols = updates.symbols.slice(0, 50); // Limit to 50 symbols
    }
    
    // Save user
    await user.save();
    
    logger.info(`Watchlist "${watchlist.name}" updated for user: ${user.email}`);
    
    return watchlist;
  } catch (error) {
    logger.error(`Error updating watchlist: ${error.message}`);
    throw error;
  }
}

/**
 * Delete a watchlist
 * @param {string} userId - User ID
 * @param {string} watchlistId - Watchlist ID
 * @returns {boolean} - Success indicator
 */
async function deleteWatchlist(userId, watchlistId) {
  try {
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user || !user.active) {
      throw new Error('User not found');
    }
    
    // Find and remove watchlist
    const watchlist = user.watchlists.id(watchlistId);
    if (!watchlist) {
      throw new Error('Watchlist not found');
    }
    
    // Remove watchlist
    watchlist.remove();
    
    // Save user
    await user.save();
    
    logger.info(`Watchlist deleted for user: ${user.email}`);
    
    return true;
  } catch (error) {
    logger.error(`Error deleting watchlist: ${error.message}`);
    throw error;
  }
}

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {string} - Reset token
 */
async function requestPasswordReset(email) {
  try {
    // Find user by email
    const user = await User.findOne({ email, active: true });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Set password reset token and expiry
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    
    // Save user
    await user.save();
    
    logger.info(`Password reset requested for user: ${email}`);
    
    return resetToken;
  } catch (error) {
    logger.error(`Error requesting password reset: ${error.message}`);
    throw error;
  }
}

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {boolean} - Success indicator
 */
async function resetPassword(token, newPassword) {
  try {
    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user by token and check if token is still valid
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      active: true
    });
    
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }
    
    // Set new password
    user.password = newPassword;
    
    // Clear reset token and expiry
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    // Invalidate tokens by changing refresh token
    user.refreshToken = undefined;
    
    // Save user
    await user.save();
    
    logger.info(`Password reset completed for user: ${user.email}`);
    
    return true;
  } catch (error) {
    logger.error(`Error resetting password: ${error.message}`);
    throw error;
  }
}

/**
 * Deactivate user account
 * @param {string} userId - User ID
 * @returns {boolean} - Success indicator
 */
async function deactivateUser(userId) {
  try {
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Deactivate account
    user.active = false;
    
    // Invalidate tokens
    user.refreshToken = undefined;
    
    // Save user
    await user.save();
    
    logger.info(`User account deactivated: ${user.email}`);
    
    return true;
  } catch (error) {
    logger.error(`Error deactivating user account: ${error.message}`);
    throw error;
  }
}

// Export functions
module.exports = {
  registerUser,
  loginUser,
  refreshTokens,
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  getUserPreferences,
  updateUserPreferences,
  getUserWatchlists,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  requestPasswordReset,
  resetPassword,
  deactivateUser
};