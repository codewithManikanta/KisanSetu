const express = require('express');
const router = express.Router();
const marketPriceController = require('../controllers/marketPriceController');
const { verifyJWT } = require('../middleware/authMiddleware');

// Get today's market prices for all crops
router.get('/daily', verifyJWT, marketPriceController.getDailyPrices);

// Get smart price suggestion for a listing
router.get('/suggestion', verifyJWT, marketPriceController.getPriceSuggestion);

// Get price for a specific crop
router.get('/crop/:cropId', verifyJWT, marketPriceController.getCropPrice);

// Admin: Force refresh prices (clear cache)
router.post('/refresh', verifyJWT, marketPriceController.refreshPrices);

// Get historical prices for charts
router.get('/history/:cropId', verifyJWT, marketPriceController.getHistoricalPrices);

module.exports = router;
