const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const formatFarmerUser = (farmer) => {
    const profile = farmer?.farmerProfile;
    return {
        id: farmer?.id,
        name: profile?.fullName || undefined,
        phone: profile?.phone || undefined,
        village: profile?.village || undefined,
        district: profile?.district || undefined,
        state: profile?.state || undefined,
        location: profile ? `${profile.village}, ${profile.district}` : undefined
    };
};

const formatBuyerUser = (buyer) => {
    const profile = buyer?.buyerProfile;
    return {
        id: buyer?.id,
        name: profile?.fullName || undefined,
        phone: profile?.phone || undefined,
        city: profile?.city || undefined,
        state: profile?.state || undefined,
        location: profile ? `${profile.city}, ${profile.state}` : undefined
    };
};

// Create a new crop listing (Farmer only)
exports.createListing = async (req, res) => {
    try {
        const {
            cropId,
            quantity,
            unit,
            expectedPrice,
            mandiPrice,
            msp,
            grade,
            harvestDate,
            images,
            location
        } = req.body;

        const farmerId = req.user.id;

        if (req.user.role !== 'FARMER') {
            return res.status(403).json({ error: 'Only farmers can create listings' });
        }

        if (!cropId || !/^[0-9a-fA-F]{24}$/.test(cropId)) {
            return res.status(400).json({ error: 'Invalid cropId' });
        }

        // Verify crop exists
        const crop = await prisma.crop.findUnique({
            where: { id: cropId }
        });

        if (!crop) {
            return res.status(404).json({ error: 'Crop not found' });
        }

        // Create listing with AVAILABLE status
        const listing = await prisma.listing.create({
            data: {
                farmerId,
                cropId,
                quantity,
                unit: unit || 'kg',
                expectedPrice,
                mandiPrice,
                msp,
                grade,
                harvestDate: new Date(harvestDate),
                images: images || [],
                location,
                status: 'AVAILABLE' // Immediately available to all buyers
            },
            include: {
                crop: true,
                farmer: {
                    include: { farmerProfile: true }
                }
            }
        });

        listing.farmer = formatFarmerUser(listing.farmer);

        // Emit WebSocket event to notify all buyers of new listing
        if (req.app.get('io')) {
            req.app.get('io').emit('listing:created', {
                listing
            });
        }

        res.status(201).json({
            message: 'Listing created successfully and is now visible to all buyers',
            listing
        });
    } catch (error) {
        console.error('Create listing error:', error);
        res.status(500).json({ error: 'Failed to create listing' });
    }
};

// Get all available listings (for buyers - search and cart system)
exports.getAllListings = async (req, res) => {
    try {
        const {
            cropId,
            location,
            minPrice,
            maxPrice,
            grade,
            status,
            search
        } = req.query;

        // Build filter
        const where = {};

        // Only show AVAILABLE listings by default for buyers
        if (status) {
            where.status = status;
        } else {
            where.status = 'AVAILABLE';
        }

        if (cropId) {
            where.cropId = cropId;
        }

        if (location) {
            where.location = {
                contains: location,
                mode: 'insensitive'
            };
        }

        if (grade) {
            where.grade = grade;
        }

        if (minPrice || maxPrice) {
            where.expectedPrice = {};
            if (minPrice) where.expectedPrice.gte = parseFloat(minPrice);
            if (maxPrice) where.expectedPrice.lte = parseFloat(maxPrice);
        }

        const listings = await prisma.listing.findMany({
            where,
            include: {
                crop: true,
                farmer: {
                    include: { farmerProfile: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formatted = listings.map(l => {
            l.farmer = formatFarmerUser(l.farmer);
            return l;
        });

        res.json({
            listings: formatted,
            count: formatted.length
        });
    } catch (error) {
        console.error('Get listings error:', error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
};

// Get single listing details
exports.getListingById = async (req, res) => {
    try {
        const { id } = req.params;

        const listing = await prisma.listing.findUnique({
            where: { id },
            include: {
                crop: true,
                farmer: {
                    include: { farmerProfile: true }
                }
            }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        listing.farmer = formatFarmerUser(listing.farmer);
        res.json({ listing });
    } catch (error) {
        console.error('Get listing error:', error);
        res.status(500).json({ error: 'Failed to fetch listing' });
    }
};

// Get farmer's own listings
exports.getMyListings = async (req, res) => {
    try {
        const farmerId = req.user.id;

        if (req.user.role !== 'FARMER') {
            return res.status(403).json({ error: 'Only farmers can view their listings' });
        }

        const listings = await prisma.listing.findMany({
            where: { farmerId },
            include: {
                crop: true,
                orders: {
                    include: {
                        buyer: {
                            include: { buyerProfile: true }
                        }
                    }
                },
                chats: {
                    include: {
                        buyer: {
                            include: { buyerProfile: true }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formatted = listings.map(l => {
            if (Array.isArray(l.orders)) {
                l.orders = l.orders.map(o => {
                    o.buyer = formatBuyerUser(o.buyer);
                    return o;
                });
            }
            if (Array.isArray(l.chats)) {
                l.chats = l.chats.map(c => {
                    c.buyer = formatBuyerUser(c.buyer);
                    return c;
                });
            }
            return l;
        });

        res.json({ listings: formatted });
    } catch (error) {
        console.error('Get my listings error:', error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
};

// Update listing
exports.updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.id;
        const updateData = req.body;

        // Check if listing exists and belongs to farmer
        const listing = await prisma.listing.findUnique({
            where: { id }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.farmerId !== farmerId) {
            return res.status(403).json({ error: 'You can only update your own listings' });
        }

        // Don't allow updating certain fields if listing has orders
        const hasOrders = await prisma.order.findFirst({
            where: { listingId: id }
        });

        if (hasOrders) {
            // Remove fields that shouldn't be updated after orders exist
            delete updateData.cropId;
            delete updateData.quantity;
        }

        // Convert harvestDate if provided
        if (updateData.harvestDate) {
            updateData.harvestDate = new Date(updateData.harvestDate);
        }

        const updatedListing = await prisma.listing.update({
            where: { id },
            data: updateData,
            include: {
                crop: true,
                farmer: {
                    include: { farmerProfile: true }
                }
            }
        });

        updatedListing.farmer = formatFarmerUser(updatedListing.farmer);

        // Emit WebSocket event
        if (req.app.get('io')) {
            req.app.get('io').emit('listing:updated', {
                listing: updatedListing
            });
        }

        res.json({
            message: 'Listing updated successfully',
            listing: updatedListing
        });
    } catch (error) {
        console.error('Update listing error:', error);
        res.status(500).json({ error: 'Failed to update listing' });
    }
};

// Delete listing
exports.deleteListing = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.id;

        const listing = await prisma.listing.findUnique({
            where: { id }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.farmerId !== farmerId) {
            return res.status(403).json({ error: 'You can only delete your own listings' });
        }

        // Check if listing has orders
        const hasOrders = await prisma.order.findFirst({
            where: { listingId: id }
        });

        if (hasOrders) {
            return res.status(400).json({
                error: 'Cannot delete listing with existing orders'
            });
        }

        await prisma.listing.delete({
            where: { id }
        });

        res.json({ message: 'Listing deleted successfully' });
    } catch (error) {
        console.error('Delete listing error:', error);
        res.status(500).json({ error: 'Failed to delete listing' });
    }
};

// Get all crops (for dropdown when creating listing)
exports.getAllCrops = async (req, res) => {
    try {
        const defaultCrops = [
            { name: 'Tomato', category: 'Vegetable', icon: '🍅' },
            { name: 'Onion', category: 'Vegetable', icon: '🧅' },
            { name: 'Potato', category: 'Vegetable', icon: '🥔' },
            { name: 'Chilli', category: 'Spice', icon: '🌶️' },
            { name: 'Brinjal', category: 'Vegetable', icon: '🍆' },
            { name: 'Okra', category: 'Vegetable', icon: '🥬' },
            { name: 'Cauliflower', category: 'Vegetable', icon: '🥦' },
            { name: 'Cabbage', category: 'Vegetable', icon: '🥬' },
            { name: 'Carrot', category: 'Vegetable', icon: '🥕' },
            { name: 'Banana', category: 'Fruit', icon: '🍌' },
            { name: 'Mango', category: 'Fruit', icon: '🥭' },
            { name: 'Grapes', category: 'Fruit', icon: '🍇' },
            { name: 'Rice', category: 'Grain', icon: '🍚' },
            { name: 'Wheat', category: 'Grain', icon: '🌾' },
            { name: 'Maize', category: 'Grain', icon: '🌽' },
            { name: 'Sugarcane', category: 'Cash Crop', icon: '🎋' },
            { name: 'Cotton', category: 'Cash Crop', icon: '🧵' },
            { name: 'Groundnut', category: 'Oilseed', icon: '🥜' },
            { name: 'Soybean', category: 'Oilseed', icon: '🫘' },
            { name: 'Turmeric', category: 'Spice', icon: '🟡' }
        ];

        const existing = await prisma.crop.findMany();
        const existingNames = new Set(existing.map(c => (c.name || '').toLowerCase()));
        const missing = defaultCrops.filter(c => !existingNames.has(c.name.toLowerCase()));

        for (const cropData of missing) {
            await prisma.crop.create({ data: cropData });
        }

        const crops = await prisma.crop.findMany({
            orderBy: {
                name: 'asc'
            }
        });

        res.json({ crops });
    } catch (error) {
        console.error('Get crops error:', error);
        res.status(500).json({ error: 'Failed to fetch crops' });
    }
};

// Search listings (advanced search for buyers)
exports.searchListings = async (req, res) => {
    try {
        const { q } = req.query; // Search query

        if (!q || q.trim().length === 0) {
            return res.json({ listings: [] });
        }

        const listings = await prisma.listing.findMany({
            where: {
                AND: [
                    { status: 'AVAILABLE' },
                    {
                        OR: [
                            {
                                crop: {
                                    name: {
                                        contains: q,
                                        mode: 'insensitive'
                                    }
                                }
                            },
                            {
                                location: {
                                    contains: q,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                grade: {
                                    contains: q,
                                    mode: 'insensitive'
                                }
                            }
                        ]
                    }
                ]
            },
            include: {
                crop: true,
                farmer: {
                    include: { farmerProfile: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formatted = listings.map(l => {
            l.farmer = formatFarmerUser(l.farmer);
            return l;
        });

        res.json({ listings: formatted });
    } catch (error) {
        console.error('Search listings error:', error);
        res.status(500).json({ error: 'Failed to search listings' });
    }
};

module.exports = exports;
