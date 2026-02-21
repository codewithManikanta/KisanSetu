const express = require('express');
const router = express.Router();
const { signup, login, getMe, updateProfile } = require('../controllers/authController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', verifyJWT, getMe);
router.put('/profile', verifyJWT, updateProfile);

module.exports = router;
