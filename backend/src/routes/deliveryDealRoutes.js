const express = require('express');
const router = express.Router();
const deliveryDealController = require('../controllers/deliveryDealController');
const { authenticate, requireTransporter, requireFarmerOrBuyer } = require('../middleware/roleAuth');

// All delivery routes require authentication
router.use(authenticate);

router.post('/create', requireFarmerOrBuyer, deliveryDealController.createDeliveryDeal);
router.get('/available', requireTransporter, deliveryDealController.getAvailableDeals);
router.post('/:id/accept', requireTransporter, deliveryDealController.acceptDeal);
router.post('/:id/decline', requireTransporter, deliveryDealController.declineDeal);
router.post('/:id/verify-otp', requireTransporter, deliveryDealController.verifyOtp);
router.put('/:id/status', requireTransporter, deliveryDealController.updateStatus);
router.get('/:id/tracking', deliveryDealController.getTracking);

module.exports = router;
