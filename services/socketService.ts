import { io, Socket } from 'socket.io-client';

class SocketService {
    private socket: Socket | null = null;
    private readonly serverUrl: string;

    constructor() {
        this.serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    }

    connect(): void {
        if (this.socket?.connected) {
            return;
        }

        this.socket = io(this.serverUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
            console.log('WebSocket connected:', this.socket?.id);
        });

        this.socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinOrderRoom(orderId: string): void {
        if (this.socket) {
            this.socket.emit('join-order-room', orderId);
        }
    }

    leaveOrderRoom(orderId: string): void {
        if (this.socket) {
            this.socket.emit('leave-order-room', orderId);
        }
    }

    onDeliveryCreated(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.on('delivery:created', callback);
        }
    }

    onDeliveryAccepted(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.on('delivery:accepted', callback);
        }
    }

    onDeliveryOtpVerified(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.on('delivery:otp-verified', callback);
        }
    }

    onDeliveryStatusUpdate(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.on('delivery:status-update', callback);
        }
    }

    onDeliveryCompleted(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.on('delivery:completed', callback);
        }
    }

    // Listing events
    joinListingsRoom(): void {
        if (this.socket) {
            this.socket.emit('join-listings-room');
        }
    }

    leaveListingsRoom(): void {
        if (this.socket) {
            this.socket.emit('leave-listings-room');
        }
    }

    onListingCreated(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.on('listing:created', callback);
        }
    }

    onListingUpdated(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.on('listing:updated', callback);
        }
    }

    removeAllListeners(): void {
        if (this.socket) {
            this.socket.removeAllListeners();
        }
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export const socketService = new SocketService();
