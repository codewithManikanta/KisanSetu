const express = require('express');
const router = express.Router();
const { signup, login, getMe } = require('../controllers/authController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', verifyJWT, getMe);

module.exports = router;
