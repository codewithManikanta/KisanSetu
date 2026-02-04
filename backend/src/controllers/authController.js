const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const mapProfile = (user, profile) => {
    const langMap = {
        'ENGLISH': 'en',
        'HINDI': 'hi',
        'TELUGU': 'te',
        'TAMIL': 'ta',
        'KANNADA': 'kn'
    };

    const base = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        language: langMap[profile?.language] || 'en',
    };

    if (user.role === 'FARMER' && profile) {
        return {
            ...base,
            name: profile.fullName,
            phone: profile.phone,
            location: {
                village: profile.village,
                district: profile.district,
                state: profile.state,
            }
        };
    } else if (user.role === 'BUYER' && profile) {
        return {
            ...base,
            name: profile.fullName,
            phone: profile.phone,
            location: {
                village: '',
                district: profile.city,
                state: profile.state,
            }
        };
    } else if (user.role === 'TRANSPORTER' && profile) {
        return {
            ...base,
            name: profile.fullName,
            phone: profile.phone,
        };
    }

    return base;
};

// Signup Controller
const signup = async (req, res) => {
    console.log('Signup Request Body:', req.body);
    const { role, email, password, profileData } = req.body;

    if (!role || !email || !password || !profileData) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let initialStatus = 'ACTIVE';

        const { user, profile } = await prisma.$transaction(async (prisma) => {
            const user = await prisma.user.create({
                data: { email, password: hashedPassword, role, status: initialStatus },
            });

            let profile = null;
            if (role === 'FARMER') {
                profile = await prisma.farmerProfile.create({
                    data: { userId: user.id, ...profileData },
                });
            } else if (role === 'BUYER') {
                profile = await prisma.buyerProfile.create({
                    data: { userId: user.id, ...profileData },
                });
            } else if (role === 'TRANSPORTER') {
                profile = await prisma.transporterProfile.create({
                    data: { userId: user.id, ...profileData, approvalStatus: 'PENDING' },
                });
            }

            return { user, profile };
        });

        const token = generateToken(user);
        res.status(201).json({
            message: 'Signup successful',
            token,
            user: mapProfile(user, profile),
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Login Controller
const login = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                farmerProfile: true,
                buyerProfile: true,
                transporterProfile: true,
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (user.role !== role) {
            // Log it but let the user know specifically
            console.log(`Role mismatch: DB has ${user.role}, login tried ${role}`);
            return res.status(403).json({
                message: `Access denied. This account is registered as ${user.role}. Please select the ${user.role} option at login.`
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const profile = user.farmerProfile || user.buyerProfile || user.transporterProfile;
        const token = generateToken(user);

        res.status(200).json({
            message: 'Login successful',
            token,
            user: mapProfile(user, profile),
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get Current User (Me)
const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                farmerProfile: true,
                buyerProfile: true,
                transporterProfile: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const profile = user.farmerProfile || user.buyerProfile || user.transporterProfile;
        res.json(mapProfile(user, profile));
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { signup, login, getMe };
