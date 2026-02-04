const setupSocketServer = (io) => {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Join order-specific room
        socket.on('join-order-room', (orderId) => {
            socket.join(`order-${orderId}`);
            console.log(`Socket ${socket.id} joined room: order-${orderId}`);
        });

        // Leave order room
        socket.on('leave-order-room', (orderId) => {
            socket.leave(`order-${orderId}`);
            console.log(`Socket ${socket.id} left room: order-${orderId}`);
        });

        // Join listings room (for buyers to get real-time listing updates)
        socket.on('join-listings-room', () => {
            socket.join('listings');
            console.log(`Socket ${socket.id} joined listings room`);
        });

        // Leave listings room
        socket.on('leave-listings-room', () => {
            socket.leave('listings');
            console.log(`Socket ${socket.id} left listings room`);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
};

module.exports = setupSocketServer;
