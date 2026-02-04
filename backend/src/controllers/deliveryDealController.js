const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const formatFarmerUser = (farmer) => {
    const profile = farmer?.farmerProfile;
    return {
        id: farmer?.id,
        name: profile?.fullName || undefined,
        phone: profile?.phone || undefined,
        location: profile ? `${profile.village}, ${profile.district}` : undefined
    };
};

const formatBuyerUser = (buyer) => {
    const profile = buyer?.buyerProfile;
    return {
        id: buyer?.id,
        name: profile?.fullName || undefined,
        phone: profile?.phone || undefined,
        location: profile ? `${profile.city}, ${profile.state}` : undefined
    };
};

const formatTransporterUser = (transporter) => {
    const profile = transporter?.transporterProfile;
    return {
        id: transporter?.id,
        name: profile?.fullName || undefined,
        phone: profile?.phone || undefined
    };
};

// Create delivery deal
exports.createDeliveryDeal = async (req, res) => {
    try {
        const { orderId, pickupLocation, dropLocation, pricePerKm, distance } = req.body;
        const userId = req.user.id;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { listing: true }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if user is authorized to create delivery
        const isAuthorized =
            (order.deliveryResponsibility === 'FARMER_ARRANGED' && order.farmerId === userId) ||
            (order.deliveryResponsibility === 'BUYER_ARRANGED' && order.buyerId === userId);

        if (!isAuthorized) {
            return res.status(403).json({ error: 'You are not authorized to arrange delivery for this order' });
        }

        // Check if delivery already exists
        const existingDelivery = await prisma.delivery.findUnique({
            where: { orderId }
        });

        if (existingDelivery) {
            return res.status(400).json({ error: 'Delivery already arranged for this order' });
        }

        // Generate 6-digit OTPs
        const pickupOtp = crypto.randomInt(100000, 999999).toString();
        const deliveryOtp = crypto.randomInt(100000, 999999).toString();

        const totalCost = distance * pricePerKm;

        const deliveryDeal = await prisma.delivery.create({
            data: {
                orderId,
                pickupLocation,
                dropLocation,
                pickupOtp,
                deliveryOtp,
                pricePerKm,
                distance,
                totalCost,
                status: 'WAITING_FOR_TRANSPORTER'
            }
        });

        // Update order status
        await prisma.order.update({
            where: { id: orderId },
            data: { orderStatus: 'DELIVERY_PENDING' }
        });

        // Emit WebSocket event for new delivery deal
        if (req.app.get('io')) {
            req.app.get('io').emit('delivery:created', {
                deliveryDeal,
                order
            });
        }

        const response = {
            message: 'Delivery deal created successfully',
            deliveryDeal
        };
        if (order.farmerId === userId) response.pickupOtp = pickupOtp;
        if (order.buyerId === userId) response.deliveryOtp = deliveryOtp;

        res.json(response);
    } catch (error) {
        console.error('Create delivery deal error:', error);
        res.status(500).json({ error: 'Failed to create delivery deal' });
    }
};

// Get available deals for transporters
exports.getAvailableDeals = async (req, res) => {
    try {
        if (req.user.role !== 'TRANSPORTER') {
            return res.status(403).json({ error: 'Only transporters can view available deals' });
        }

        const deals = await prisma.delivery.findMany({
            where: {
                OR: [
                    {
                        status: 'WAITING_FOR_TRANSPORTER',
                        NOT: { declinedBy: { has: req.user.id } }
                    },
                    {
                        transporterId: req.user.id
                    }
                ]
            },
            include: {
                order: {
                    include: {
                        listing: {
                            include: {
                                crop: true,
                                farmer: {
                                    include: { farmerProfile: true }
                                }
                            }
                        },
                        buyer: {
                            include: { buyerProfile: true }
                        }
                    }
                },
                transporter: {
                    include: { transporterProfile: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = deals.map(d => {
            if (d.order?.listing?.farmer) d.order.listing.farmer = formatFarmerUser(d.order.listing.farmer);
            if (d.order?.buyer) d.order.buyer = formatBuyerUser(d.order.buyer);
            if (d.transporter) d.transporter = formatTransporterUser(d.transporter);
            d.pickupOtp = undefined;
            d.deliveryOtp = undefined;
            return d;
        });

        res.json({ deals: formatted });
    } catch (error) {
        console.error('Get available deals error:', error);
        res.status(500).json({ error: 'Failed to fetch available deals' });
    }
};

// Accept delivery deal
exports.acceptDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const transporterId = req.user.id;

        if (req.user.role !== 'TRANSPORTER') {
            return res.status(403).json({ error: 'Only transporters can accept deals' });
        }

        const deal = await prisma.delivery.findUnique({
            where: { id },
            include: { order: true }
        });

        if (!deal) {
            return res.status(404).json({ error: 'Delivery deal not found' });
        }

        if (deal.transporterId) {
            return res.status(400).json({ error: 'Deal already accepted by another transporter' });
        }

        const updatedDeal = await prisma.delivery.update({
            where: { id },
            data: {
                transporterId,
                status: 'TRANSPORTER_ASSIGNED'
            },
            include: {
                order: {
                    include: {
                        listing: { include: { crop: true } },
                        buyer: { include: { buyerProfile: true } },
                        farmer: { include: { farmerProfile: true } }
                    }
                },
                transporter: {
                    include: { transporterProfile: true }
                }
            }
        });

        if (updatedDeal.order?.buyer) updatedDeal.order.buyer = formatBuyerUser(updatedDeal.order.buyer);
        if (updatedDeal.order?.farmer) updatedDeal.order.farmer = formatFarmerUser(updatedDeal.order.farmer);
        if (updatedDeal.transporter) updatedDeal.transporter = formatTransporterUser(updatedDeal.transporter);
        updatedDeal.pickupOtp = undefined;
        updatedDeal.deliveryOtp = undefined;

        // Emit WebSocket event
        if (req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`order-${deal.orderId}`).emit('delivery:accepted', {
                deliveryDeal: updatedDeal
            });
        }

        res.json({ message: 'Deal accepted successfully', deliveryDeal: updatedDeal });
    } catch (error) {
        console.error('Accept deal error:', error);
        res.status(500).json({ error: 'Failed to accept deal' });
    }
};

// Decline delivery deal (Transporter only)
exports.declineDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const transporterId = req.user.id;

        if (req.user.role !== 'TRANSPORTER') {
            return res.status(403).json({ error: 'Only transporters can decline deals' });
        }

        const deal = await prisma.delivery.findUnique({
            where: { id }
        });

        if (!deal) {
            return res.status(404).json({ error: 'Delivery deal not found' });
        }

        if (deal.status !== 'WAITING_FOR_TRANSPORTER' || deal.transporterId) {
            return res.status(400).json({ error: 'Deal is not available to decline' });
        }

        const declinedBy = Array.isArray(deal.declinedBy) ? deal.declinedBy : [];
        if (declinedBy.includes(transporterId)) {
            return res.json({ message: 'Deal already declined' });
        }

        await prisma.delivery.update({
            where: { id },
            data: { declinedBy: [...declinedBy, transporterId] }
        });

        res.json({ message: 'Deal declined' });
    } catch (error) {
        console.error('Decline deal error:', error);
        res.status(500).json({ error: 'Failed to decline deal' });
    }
};

// Verify OTP (Pickup or Delivery)
exports.verifyOtp = async (req, res) => {
    try {
        const { id } = req.params;
        const { otp } = req.body;
        const transporterId = req.user.id;

        const deal = await prisma.delivery.findUnique({
            where: { id }
        });

        if (!deal) {
            return res.status(404).json({ error: 'Delivery deal not found' });
        }

        if (deal.transporterId !== transporterId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let updateData = {};
        let orderStatus = '';
        let listingStatus = '';
        let otpType = '';

        // Determine verification type based on current status
        if (deal.status === 'TRANSPORTER_ASSIGNED' || deal.status === 'ACCEPTED') {
             // Pickup Verification
             if (deal.pickupOtp !== otp) {
                 return res.status(400).json({ error: 'Invalid Pickup OTP' });
             }
             updateData = {
                 status: 'PICKED_UP',
                 pickupTimestamp: new Date()
             };
             orderStatus = 'IN_DELIVERY';
             listingStatus = 'IN_DELIVERY';
             otpType = 'PICKUP';

        } else if (deal.status === 'IN_TRANSIT' || deal.status === 'PICKED_UP') {
            // Delivery Verification (Allow verification from PICKED_UP directly if skipped IN_TRANSIT update)
             if (deal.deliveryOtp !== otp) {
                 return res.status(400).json({ error: 'Invalid Delivery OTP' });
             }
             updateData = {
                 status: 'COMPLETED',
                 deliveryTimestamp: new Date()
             };
             orderStatus = 'COMPLETED';
             listingStatus = 'SOLD';
             otpType = 'DELIVERY';
        } else {
             return res.status(400).json({ error: 'Invalid status for OTP verification' });
        }

        const updatedDeal = await prisma.delivery.update({
            where: { id },
            data: updateData
        });

        // Update order status
        if (orderStatus) {
            await prisma.order.update({
                where: { id: deal.orderId },
                data: { orderStatus }
            });
        }

        // Update listing status
        if (listingStatus) {
            const order = await prisma.order.findUnique({
                where: { id: deal.orderId }
            });
            await prisma.listing.update({
                where: { id: order.listingId },
                data: { status: listingStatus }
            });
        }

        // Emit WebSocket event
        if (req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`order-${deal.orderId}`).emit('delivery:otp-verified', {
                deliveryDeal: updatedDeal
                , type: otpType
            });
            
            if (updateData.status === 'COMPLETED') {
                 io.to(`order-${deal.orderId}`).emit('delivery:completed', {
                    deliveryDeal: updatedDeal
                });
            }
        }

        res.json({ message: 'OTP verified successfully', deliveryDeal: updatedDeal });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

// Update delivery status
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const transporterId = req.user.id;

        const deal = await prisma.delivery.findUnique({
            where: { id }
        });

        if (!deal) {
            return res.status(404).json({ error: 'Delivery deal not found' });
        }

        if (deal.transporterId !== transporterId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Validate status transitions
        const validTransitions = {
            'TRANSPORTER_ASSIGNED': ['PICKED_UP'],
            'PICKED_UP': ['IN_TRANSIT', 'DELIVERED'],
            'IN_TRANSIT': ['DELIVERED'],
            'DELIVERED': ['COMPLETED']
        };

        if (!validTransitions[deal.status]?.includes(status)) {
            // return res.status(400).json({ error: 'Invalid status transition' });
            // Allow flexibility for demo purposes, but log it
            console.warn(`Invalid transition attempted: ${deal.status} -> ${status}`);
        }

        const updateData = { status };

        if (status === 'DELIVERED') {
            updateData.deliveryTimestamp = new Date();
        }

        const updatedDeal = await prisma.delivery.update({
            where: { id },
            data: updateData
        });

        // Update order status
        if (status === 'COMPLETED' || status === 'DELIVERED') {
             const newOrderStatus = status === 'DELIVERED' ? 'COMPLETED' : 'COMPLETED'; // Map DELIVERED to COMPLETED order status for simplicity
            await prisma.order.update({
                where: { id: deal.orderId },
                data: { orderStatus: newOrderStatus }
            });

            // Update listing status
            const order = await prisma.order.findUnique({
                where: { id: deal.orderId }
            });

            await prisma.listing.update({
                where: { id: order.listingId },
                data: { status: 'SOLD' }
            });
        }

        // Emit WebSocket event
        if (req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`order-${deal.orderId}`).emit('delivery:status-update', {
                deliveryDeal: updatedDeal
            });

            if (status === 'COMPLETED' || status === 'DELIVERED') {
                io.to(`order-${deal.orderId}`).emit('delivery:completed', {
                    deliveryDeal: updatedDeal
                });
            }
        }

        res.json({ message: 'Status updated successfully', deliveryDeal: updatedDeal });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
};

// Get delivery tracking data
exports.getTracking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const deal = await prisma.delivery.findUnique({
            where: { id },
            include: {
                order: {
                    include: {
                        listing: { include: { crop: true } },
                        buyer: { include: { buyerProfile: true } },
                        farmer: { include: { farmerProfile: true } }
                    }
                },
                transporter: {
                    include: { transporterProfile: true }
                }
            }
        });

        if (!deal) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        // Check authorization
        const isAuthorized =
            deal.order.buyerId === userId ||
            deal.order.farmerId === userId ||
            deal.transporterId === userId;

        if (!isAuthorized) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (deal.order?.buyer) deal.order.buyer = formatBuyerUser(deal.order.buyer);
        if (deal.order?.farmer) deal.order.farmer = formatFarmerUser(deal.order.farmer);
        if (deal.transporter) deal.transporter = formatTransporterUser(deal.transporter);

        res.json({ deliveryDeal: deal });
    } catch (error) {
        console.error('Get tracking error:', error);
        res.status(500).json({ error: 'Failed to fetch tracking data' });
    }
};

module.exports = exports;
