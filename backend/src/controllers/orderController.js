const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create order (from cart or negotiation)
exports.createOrder = async (req, res) => {
    try {
        const { listingId, quantity, priceFinal, deliveryResponsibility, negotiationId } = req.body;
        const buyerId = req.user.id;

        if (!/^[0-9a-fA-F]{24}$/.test(listingId)) {
            return res.status(400).json({ error: 'Invalid listing ID' });
        }

        if (negotiationId && !/^[0-9a-fA-F]{24}$/.test(negotiationId)) {
            return res.status(400).json({ error: 'Invalid negotiation ID' });
        }

        const listing = await prisma.listing.findUnique({
            where: { id: listingId }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        if (listing.status !== 'AVAILABLE') {
            return res.status(400).json({ error: 'Listing is no longer available' });
        }

        if (listing.quantity < qty) {
            return res.status(400).json({ error: `Insufficient quantity. Only ${listing.quantity} available.` });
        }

        const order = await prisma.order.create({
            data: {
                listingId,
                buyerId,
                farmerId: listing.farmerId,
                quantity: qty,
                priceFinal,
                deliveryResponsibility: deliveryResponsibility || 'FARMER_ARRANGED',
                orderStatus: 'ORDER_CREATED'
            }
        });

        // If from negotiation, link them
        if (negotiationId) {
            await prisma.negotiatingChat.update({
                where: { id: negotiationId },
                data: {
                    orderId: order.id,
                    status: 'ACCEPTED'
                }
            });
        }

        // Update listing status
        const newQuantity = listing.quantity - qty;
        await prisma.listing.update({
            where: { id: listingId },
            data: {
                status: newQuantity <= 0 ? 'SOLD' : 'AVAILABLE',
                quantity: newQuantity
            }
        });

        res.json({ message: 'Order created successfully', order });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};

// Get user's orders (role-based)
exports.getOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let orders;

        if (role === 'BUYER') {
            orders = await prisma.order.findMany({
                where: { buyerId: userId },
                include: {
                    listing: {
                        include: {
                            crop: true,
                            farmer: {
                                include: { farmerProfile: true }
                            }
                        }
                    },
                    delivery: true
                },
                orderBy: { createdAt: 'desc' }
            });

            orders = orders.map(order => {
                if (order.delivery) {
                    delete order.delivery.pickupOtp;
                }
                if (order.listing?.farmer?.farmerProfile) {
                    order.farmer = {
                        id: order.listing.farmer.id,
                        name: order.listing.farmer.farmerProfile.fullName,
                        location: `${order.listing.farmer.farmerProfile.village}, ${order.listing.farmer.farmerProfile.district}`
                    };
                }
                return order;
            });

        } else if (role === 'FARMER') {
            orders = await prisma.order.findMany({
                where: { farmerId: userId },
                include: {
                    listing: {
                        include: { crop: true }
                    },
                    buyer: {
                        include: { buyerProfile: true }
                    },
                    delivery: true
                },
                orderBy: { createdAt: 'desc' }
            });

            orders = orders.map(order => {
                if (order.delivery) {
                    delete order.delivery.deliveryOtp;
                }
                if (order.buyer?.buyerProfile) {
                    order.buyer = {
                        id: order.buyer.id,
                        name: order.buyer.buyerProfile.fullName,
                        location: `${order.buyer.buyerProfile.city}, ${order.buyer.buyerProfile.state}`
                    };
                }
                return order;
            });
        } else {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.json({ orders });
    } catch (error) {
        console.error('Get orders error DETAILED:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch orders' });
    }
};

// Get order details
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                listing: {
                    include: {
                        crop: true,
                        farmer: {
                            select: { id: true, name: true, location: true, phone: true }
                        }
                    }
                },
                buyer: {
                    select: { id: true, name: true, location: true, phone: true }
                },
                delivery: {
                    include: {
                        transporter: {
                            select: { id: true, name: true, phone: true }
                        }
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check authorization
        if (order.buyerId !== userId && order.farmerId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.json({ order });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
};

// Set delivery responsibility
exports.setDeliveryOption = async (req, res) => {
    try {
        const { id } = req.params;
        const { deliveryResponsibility } = req.body;
        const userId = req.user.id;

        const order = await prisma.order.findUnique({
            where: { id }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Only buyer can set delivery option
        if (order.buyerId !== userId) {
            return res.status(403).json({ error: 'Only buyer can set delivery option' });
        }

        // Can't change if delivery already created
        const existingDelivery = await prisma.delivery.findUnique({
            where: { orderId: id }
        });

        if (existingDelivery) {
            return res.status(400).json({ error: 'Delivery already arranged' });
        }

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { deliveryResponsibility }
        });

        res.json({ message: 'Delivery option updated', order: updatedOrder });
    } catch (error) {
        console.error('Set delivery option error:', error);
        res.status(500).json({ error: 'Failed to update delivery option' });
    }
};

module.exports = exports;
