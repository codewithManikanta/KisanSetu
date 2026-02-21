const express = require('express');
const router = express.Router();
const negotiationController = require('../controllers/negotiationController');
const auth = require('../middleware/auth');

// Start a new negotiation
router.post('/start', auth, negotiationController.startNegotiation);

// Get all negotiations for the current user
router.get('/my', auth, negotiationController.getMyNegotiations);

// Get a specific negotiation by ID
router.get('/:id', auth, negotiationController.getNegotiationById);

// Get messages for a negotiation
router.get('/:id/messages', auth, negotiationController.getMessages);

// Send a text message
router.post('/:id/messages', auth, negotiationController.sendMessage);

// Send a counter offer
router.post('/:id/counter', auth, negotiationController.sendOffer);

// Accept the current offer
router.post('/:id/accept', auth, negotiationController.acceptOffer);

// Reject the current offer
router.post('/:id/reject', auth, negotiationController.rejectOffer);

module.exports = router;
