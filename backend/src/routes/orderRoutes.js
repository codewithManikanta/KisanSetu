const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, requireFarmerOrBuyer } = require('../middleware/roleAuth');

// All order routes require authentication
router.use(authenticate);

router.post('/create', orderController.createOrder);
router.get('/', requireFarmerOrBuyer, orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id/delivery-option', orderController.setDeliveryOption);

module.exports = router;
