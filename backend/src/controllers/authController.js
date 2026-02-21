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
        profilePhoto: user.profilePhoto,
        language: langMap[profile?.language] || 'en',
        fullProfile: profile, // Include the raw profile object for frontend access
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
                address: profile.address,
                latitude: profile.latitude,
                longitude: profile.longitude,
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
                address: profile.address,
                latitude: profile.latitude,
                longitude: profile.longitude,
            }
        };
    } else if (user.role === 'TRANSPORTER' && profile) {
        return {
            ...base,
            name: profile.fullName,
            phone: profile.phone,
            location: {
                address: profile.address,
                city: profile.city,
                state: profile.state,
                pincode: profile.pincode,
            },
            fleet: {
                vehicleType: profile.vehicleType,
                vehicleNumber: profile.vehicleNumber,
                capacity: profile.capacity,
                pricePerKm: profile.pricePerKm,
            }
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
    console.log('Login Request Body:', req.body);
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

// Update Profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const updates = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(updates.profilePhoto !== undefined && { profilePhoto: updates.profilePhoto }), // Update profile photo if provided (allow null/empty)
            },
            include: {
                farmerProfile: true,
                buyerProfile: true,
                transporterProfile: true,
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let updatedProfile = null;

        if (role === 'FARMER') {
            updatedProfile = await prisma.farmerProfile.update({
                where: { userId },
                data: {
                    fullName: updates.name,
                    phone: updates.phone,
                    village: updates.location?.village,
                    district: updates.location?.district,
                    state: updates.location?.state,
                    address: updates.location?.address,
                    latitude: updates.location?.latitude,
                    longitude: updates.location?.longitude,
                }
            });
        } else if (role === 'BUYER') {
            updatedProfile = await prisma.buyerProfile.update({
                where: { userId },
                data: {
                    fullName: updates.name,
                    phone: updates.phone,
                    city: updates.location?.district, // Mapping district to city for buyer
                    state: updates.location?.state,
                    address: updates.location?.address,
                    latitude: updates.location?.latitude,
                    longitude: updates.location?.longitude,
                }
            });
        } else if (role === 'TRANSPORTER') {
            const dataToUpdate = {
                fullName: updates.name,
                phone: updates.phone,
                address: updates.location?.address,
                city: updates.location?.city,
                state: updates.location?.state,
                pincode: updates.location?.pincode,
                latitude: updates.location?.latitude,
                longitude: updates.location?.longitude,
            };

            // Fleet/Vehicle details update
            if (updates.fleet) {
                if (updates.fleet.vehicleType) dataToUpdate.vehicleType = updates.fleet.vehicleType;
                if (updates.fleet.vehicleNumber) dataToUpdate.vehicleNumber = updates.fleet.vehicleNumber;
                if (updates.fleet.capacity !== undefined) dataToUpdate.capacity = parseFloat(updates.fleet.capacity);
                if (updates.fleet.pricePerKm !== undefined) dataToUpdate.pricePerKm = parseFloat(updates.fleet.pricePerKm);
            }

            // Handle serviceRange update if present
            if (updates.serviceRange !== undefined) {
                dataToUpdate.serviceRange = parseFloat(updates.serviceRange);
            }

            updatedProfile = await prisma.transporterProfile.update({
                where: { userId },
                data: dataToUpdate
            });
        }

        const fullUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                farmerProfile: true,
                buyerProfile: true,
                transporterProfile: true,
            }
        });

        const profile = fullUser.farmerProfile || fullUser.buyerProfile || fullUser.transporterProfile;

        res.json({
            message: 'Profile updated successfully',
            user: mapProfile(fullUser, profile)
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

module.exports = { signup, login, getMe, updateProfile };
