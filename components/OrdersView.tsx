import React, { useState, useEffect } from 'react';
import { Order, DeliveryDeal } from '../types';
import { orderAPI, deliveryDealAPI } from '../services/api';
import { socketService } from '../services/socketService';
import DeliveryTimeline from './DeliveryTimeline';
import OTPModal from './OTPModal';
import StatusBadge from './StatusBadge';

const OrdersView: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [currentOtp, setCurrentOtp] = useState('');

    const [showArrangeDeliveryModal, setShowArrangeDeliveryModal] = useState(false);
    const [arrangeDeliveryOrder, setArrangeDeliveryOrder] = useState<Order | null>(null);

    useEffect(() => {
        loadOrders();

        // Connect to WebSocket
        socketService.connect();

        // Listen for delivery updates
        socketService.onDeliveryAccepted((data) => {
            console.log('Delivery accepted:', data);
            loadOrders();
        });

        socketService.onDeliveryOtpVerified((data) => {
            console.log('OTP verified:', data);
            loadOrders();
        });

        socketService.onDeliveryStatusUpdate((data) => {
            console.log('Delivery status updated:', data);
            loadOrders();
        });

        socketService.onDeliveryCompleted((data) => {
            console.log('Delivery completed:', data);
            loadOrders();
        });

        return () => {
            socketService.removeAllListeners();
        };
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const response = await orderAPI.getAll();
            setOrders(response.orders || []);

            // Join rooms for all orders
            response.orders?.forEach((order: Order) => {
                socketService.joinOrderRoom(order.id);
            });
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewTracking = (order: Order) => {
        setSelectedOrder(order);
    };

    const handleShowOtp = (order: Order) => {
        return;
    };

    const handleArrangeDeliveryClick = (order: Order) => {
        setArrangeDeliveryOrder(order);
        setShowArrangeDeliveryModal(true);
    };

    const confirmArrangeDelivery = async () => {
        if (!arrangeDeliveryOrder) return;

        try {
            // Mock distance/price calculation for demo
            const distance = 50; 
            const pricePerKm = 20;
            
            await deliveryDealAPI.create({
                orderId: arrangeDeliveryOrder.id,
                pickupLocation: {
                    address: arrangeDeliveryOrder.listing?.location || 'Farmer Location',
                    lat: 0, lng: 0
                },
                dropLocation: {
                    address: arrangeDeliveryOrder.buyer?.location || 'Buyer Location',
                    lat: 0, lng: 0
                },
                distance,
                pricePerKm
            });
            
            alert('Delivery arranged successfully! Transporters can now see your request.');
            setShowArrangeDeliveryModal(false);
            setArrangeDeliveryOrder(null);
            loadOrders();
        } catch (error: any) {
            alert(error.message || 'Failed to arrange delivery');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-4xl text-green-600 mb-4"></i>
                    <p className="text-sm font-bold text-gray-500">Loading orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">My Orders</h2>
                    <p className="text-sm text-gray-500 mt-1">{orders.length} total orders</p>
                </div>
            </div>

            {/* Orders List */}
            {orders.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-box text-3xl text-gray-300"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No orders yet</h3>
                    <p className="text-sm text-gray-500">Your orders will appear here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            {/* Order Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900">
                                        {order.listing?.crop?.name || 'Order'}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">Order ID: #{order.id.slice(0, 8)}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Farmer: {order.farmer?.name} • {order.listing?.location}
                                    </p>
                                </div>
                                <StatusBadge status={order.orderStatus} type="order" />
                            </div>

                            {/* Order Details */}
                            <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-2xl">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Quantity</p>
                                    <p className="text-lg font-black text-gray-900">{order.quantity} kg</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Price</p>
                                    <p className="text-lg font-black text-gray-900">₹{order.priceFinal.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Delivery</p>
                                    <p className="text-xs font-bold text-gray-700">
                                        {order.deliveryResponsibility === 'FARMER_ARRANGED' ? 'Farmer' : 'Buyer'}
                                    </p>
                                </div>
                            </div>

                            {/* Delivery Status */}
                            {order.delivery && (
                                <div className="border-t border-gray-100 pt-4 mt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-truck text-green-600"></i>
                                            <span className="text-sm font-bold text-gray-700">Delivery Status</span>
                                        </div>
                                        <StatusBadge status={order.delivery.status} type="delivery" />
                                    </div>

                                    {/* Transporter Info */}
                                    {order.delivery.transporter && (
                                        <div className="bg-blue-50 rounded-2xl p-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <i className="fas fa-user text-blue-600"></i>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Transporter</p>
                                                    <p className="text-sm font-bold text-gray-900">{order.delivery.transporter.name}</p>
                                                    <p className="text-xs text-gray-500">{order.delivery.transporter.phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                            {/* OTP Display - Delivery */}
                            {order.delivery.deliveryOtp && (order.delivery.status === 'IN_TRANSIT' || order.delivery.status === 'PICKED_UP') && (
                                <div className="w-full bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <i className="fas fa-shield-alt text-blue-600 text-xl"></i>
                                            <div className="text-left">
                                                <p className="text-xs text-gray-600">Delivery OTP</p>
                                                <p className="text-lg font-black text-blue-600 tracking-widest">{order.delivery.deliveryOtp}</p>
                                                <p className="text-[10px] text-gray-500">Share with transporter upon arrival</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleViewTracking(order)}
                                            className="flex-1 bg-gray-900 text-white py-3 rounded-2xl font-bold text-sm hover:bg-gray-800 active:scale-95 transition-all"
                                        >
                                            <i className="fas fa-map-marked-alt mr-2"></i>
                                            View Tracking
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* No Delivery Yet */}
                            {!order.delivery && order.orderStatus === 'ORDER_CREATED' && (
                                <div className="border-t border-gray-100 pt-4 mt-4">
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
                                        <i className="fas fa-clock text-yellow-600 text-2xl mb-2"></i>
                                        <p className="text-sm font-bold text-gray-700">Waiting for delivery arrangement</p>
                                        <p className="text-xs text-gray-500 mt-2 mb-3">
                                            {order.deliveryResponsibility === 'FARMER_ARRANGED'
                                                ? 'Farmer will arrange delivery soon'
                                                : 'Please arrange delivery for this order'}
                                        </p>
                                        
                                        {order.deliveryResponsibility === 'BUYER_ARRANGED' && (
                                            <button
                                                onClick={() => handleArrangeDeliveryClick(order)}
                                                className="bg-gray-900 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-gray-800 transition-all"
                                            >
                                                Arrange Delivery Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Tracking Modal */}
            {selectedOrder && selectedOrder.delivery && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">Delivery Tracking</h2>
                                <p className="text-sm text-gray-500 mt-1">Order #{selectedOrder.id.slice(0, 8)}</p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                                aria-label="Close"
                            >
                                <i className="fas fa-times text-gray-600"></i>
                            </button>
                        </div>

                        <DeliveryTimeline
                            status={selectedOrder.delivery.status}
                            pickupTimestamp={selectedOrder.delivery.pickupTimestamp}
                            deliveryTimestamp={selectedOrder.delivery.deliveryTimestamp}
                            createdAt={selectedOrder.delivery.createdAt}
                        />

                        {/* Delivery Details */}
                        <div className="mt-6 space-y-4">
                            <div className="bg-gray-50 rounded-2xl p-4">
                                <p className="text-xs text-gray-500 mb-2">Pickup Location</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {selectedOrder.delivery.pickupLocation.address}
                                </p>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-4">
                                <p className="text-xs text-gray-500 mb-2">Drop Location</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {selectedOrder.delivery.dropLocation.address}
                                </p>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Distance</p>
                                        <p className="text-lg font-black text-gray-900">{selectedOrder.delivery.distance} km</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 mb-1">Delivery Cost</p>
                                        <p className="text-lg font-black text-gray-900">₹{selectedOrder.delivery.totalCost}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* OTP Modal */}
            <OTPModal
                isOpen={showOtpModal}
                onClose={() => setShowOtpModal(false)}
                mode="display"
                otp={currentOtp}
                title="Pickup OTP"
            />

            {/* Arrange Delivery Modal */}
            {showArrangeDeliveryModal && arrangeDeliveryOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-black text-gray-900 mb-2 text-center">Arrange Delivery</h3>
                        <p className="text-xs text-gray-500 text-center mb-6">Confirm delivery request details</p>
                        
                        <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pickup</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{arrangeDeliveryOrder.listing?.location}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Drop</p>
                                <p className="text-sm font-bold text-gray-900 truncate">My Location</p>
                            </div>
                            <div className="pt-2 border-t border-gray-200 flex justify-between">
                                <span className="text-xs font-bold text-gray-500">Est. Distance</span>
                                <span className="text-xs font-bold text-gray-900">50 km</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs font-bold text-gray-500">Est. Cost</span>
                                <span className="text-xs font-bold text-green-600">₹1,000</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowArrangeDeliveryModal(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmArrangeDelivery}
                                className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold shadow-lg shadow-gray-200 active:scale-95 transition-all"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdersView;
