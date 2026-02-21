const jwt = require('jsonwebtoken');

// Middleware to check if user is a farmer
const requireFarmer = (req, res, next) => {
    if (req.user && req.user.role === 'FARMER') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Farmers only.' });
    }
};

// Middleware to check if user is a buyer
const requireBuyer = (req, res, next) => {
    if (req.user && req.user.role === 'BUYER') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Buyers only.' });
    }
};

// Middleware to check if user is a transporter
const requireTransporter = (req, res, next) => {
    if (req.user && req.user.role === 'TRANSPORTER') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Transporters only.' });
    }
};

// Middleware to check if user is farmer or buyer
const requireFarmerOrBuyer = (req, res, next) => {
    if (req.user && (req.user.role === 'FARMER' || req.user.role === 'BUYER')) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Farmers and Buyers only.' });
    }
};

// JWT authentication middleware
const authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = {
    requireFarmer,
    requireBuyer,
    requireTransporter,
    requireFarmerOrBuyer,
    authenticate
};
