const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Add item to cart
exports.addToCart = async (req, res) => {
    try {
        const { listingId, quantity } = req.body;
        const buyerId = req.user.id;

        if (!listingId || !quantity) {
            return res.status(400).json({ error: 'Missing listingId or quantity' });
        }

        if (!/^[0-9a-fA-F]{24}$/.test(listingId)) {
            return res.status(404).json({ error: 'Listing not found (invalid ID format)' });
        }

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        // Check if listing exists and has enough quantity
        const listing = await prisma.listing.findUnique({
            where: { id: listingId }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.status !== 'AVAILABLE') {
            return res.status(400).json({ error: 'Listing is no longer available' });
        }

        if (listing.quantity < qty) {
            return res.status(400).json({ error: `Insufficient quantity. Only ${listing.quantity}kg available.` });
        }

        // Get or create cart
        let cart = await prisma.cart.findUnique({
            where: { buyerId },
            include: { items: true }
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { buyerId },
                include: { items: true }
            });
        }

        // Check if item already in cart
        const existingItem = cart.items.find(item => item.listingId === listingId);

        if (existingItem) {
            if (qty > listing.quantity) {
                return res.status(400).json({ error: `Insufficient quantity. Only ${listing.quantity}kg available.` });
            }

            // Set quantity (treat request quantity as desired quantity)
            const updatedItem = await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: qty,
                    lockedAt: new Date()
                }
            });

            return res.json({ message: 'Cart updated', item: updatedItem });
        }

        // Create new cart item
        const cartItem = await prisma.cartItem.create({
            data: {
                cartId: cart.id,
                listingId,
                quantity: qty,
                lockedAt: new Date()
            }
        });

        res.json({ message: 'Item added to cart', item: cartItem });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: error.message || 'Failed to add item to cart' });
    }
};

// Get buyer's cart
exports.getCart = async (req, res) => {
    try {
        const buyerId = req.user.id;

        const cart = await prisma.cart.findUnique({
            where: { buyerId },
            include: {
                items: {
                    include: {
                        listing: {
                            include: {
                                crop: true,
                                farmer: {
                                    include: { farmerProfile: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (cart) {
            cart.items = cart.items.map(item => {
                const farmer = item.listing.farmer;
                if (farmer && farmer.farmerProfile) {
                    item.listing.farmer = {
                        id: farmer.id,
                        name: farmer.farmerProfile.fullName,
                        location: `${farmer.farmerProfile.village}, ${farmer.farmerProfile.district}`
                    };
                }
                return item;
            });
        }

        res.json({ cart: cart || { items: [] } });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;
        const buyerId = req.user.id;

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        const cartItem = await prisma.cartItem.findUnique({
            where: { id: itemId },
            include: { cart: true, listing: true }
        });

        if (!cartItem || cartItem.cart.buyerId !== buyerId) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        if (cartItem.listing.status !== 'AVAILABLE') {
            return res.status(400).json({ error: 'Listing is no longer available' });
        }

        if (cartItem.listing.quantity < qty) {
            return res.status(400).json({ error: `Insufficient quantity. Only ${cartItem.listing.quantity}kg available.` });
        }

        // Update cart item
        const updatedItem = await prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity: qty }
        });

        res.json({ message: 'Cart item updated', item: updatedItem });
    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(500).json({ error: error.message || 'Failed to update cart item' });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;
        const buyerId = req.user.id;

        const cartItem = await prisma.cartItem.findUnique({
            where: { id: itemId },
            include: { cart: true, listing: true }
        });

        if (!cartItem || cartItem.cart.buyerId !== buyerId) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        // Delete cart item
        await prisma.cartItem.delete({
            where: { id: itemId }
        });

        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
};

// Checkout - Convert cart to orders
exports.checkout = async (req, res) => {
    try {
        const { deliveryResponsibility } = req.body; // FARMER_ARRANGED or BUYER_ARRANGED
        const buyerId = req.user.id;

        const cart = await prisma.cart.findUnique({
            where: { buyerId },
            include: {
                items: {
                    include: {
                        listing: {
                            include: { farmer: true }
                        }
                    }
                }
            }
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const listingsById = new Map();
        for (const item of cart.items) {
            const listing = await prisma.listing.findUnique({ where: { id: item.listingId } });
            if (!listing || listing.status !== 'AVAILABLE') {
                return res.status(400).json({ error: 'One or more items are no longer available' });
            }
            if (listing.quantity < item.quantity) {
                return res.status(400).json({ error: `Insufficient quantity for one or more items. Only ${listing.quantity}kg available.` });
            }
            listingsById.set(item.listingId, listing);
        }

        const orders = [];
        for (const item of cart.items) {
            const listing = listingsById.get(item.listingId);

            const order = await prisma.order.create({
                data: {
                    listingId: item.listingId,
                    buyerId,
                    farmerId: item.listing.farmerId,
                    quantity: item.quantity,
                    priceFinal: item.listing.expectedPrice * item.quantity,
                    deliveryResponsibility: deliveryResponsibility || 'FARMER_ARRANGED',
                    orderStatus: 'ORDER_CREATED'
                }
            });

            const newQuantity = listing.quantity - item.quantity;
            await prisma.listing.update({
                where: { id: item.listingId },
                data: {
                    quantity: newQuantity,
                    status: newQuantity <= 0 ? 'SOLD' : 'AVAILABLE'
                }
            });

            await prisma.cartItem.update({
                where: { id: item.id },
                data: { orderId: order.id }
            });

            orders.push(order);
        }

        await prisma.cartItem.deleteMany({
            where: { cartId: cart.id }
        });

        res.json({ message: 'Checkout successful', orders });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Checkout failed' });
    }
};

module.exports = exports;
