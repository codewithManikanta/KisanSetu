import React, { useState, useEffect } from 'react';
import { Order, DeliveryDeal } from '../types';
import { orderAPI, deliveryDealAPI } from '../services/api';
import { socketService } from '../services/socketService';
import OTPModal from './OTPModal';
import StatusBadge from './StatusBadge';

interface FarmerOrdersViewProps {
    onClose?: () => void;
}

const FarmerOrdersView: React.FC<FarmerOrdersViewProps> = ({ onClose }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [currentOtp, setCurrentOtp] = useState('');

    // Delivery form state
    const [deliveryForm, setDeliveryForm] = useState({
        pickupAddress: '',
        dropAddress: '',
        distance: '',
        pricePerKm: '15'
    });

    useEffect(() => {
        loadOrders();

        socketService.connect();
        socketService.onDeliveryAccepted(() => loadOrders());
        socketService.onDeliveryOtpVerified(() => loadOrders());
        socketService.onDeliveryStatusUpdate(() => loadOrders());

        return () => {
            socketService.removeAllListeners();
        };
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const response = await orderAPI.getAll();
            setOrders(response.orders || []);

            response.orders?.forEach((order: Order) => {
                socketService.joinOrderRoom(order.id);
            });
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleArrangeDelivery = (order: Order) => {
        setSelectedOrder(order);
        setDeliveryForm({
            pickupAddress: order.listing?.location || '',
            dropAddress: order.buyer?.location ?
                `${order.buyer.location.village}, ${order.buyer.location.district}` : '',
            distance: '',
            pricePerKm: '15'
        });
        setShowDeliveryModal(true);
    };

    const handleCreateDelivery = async () => {
        if (!selectedOrder) return;

        try {
            const distance = parseFloat(deliveryForm.distance);
            const pricePerKm = parseFloat(deliveryForm.pricePerKm);

            const response = await deliveryDealAPI.create({
                orderId: selectedOrder.id,
                pickupLocation: {
                    address: deliveryForm.pickupAddress,
                    lat: 0,
                    lng: 0
                },
                dropLocation: {
                    address: deliveryForm.dropAddress,
                    lat: 0,
                    lng: 0
                },
                distance,
                pricePerKm
            });

            setCurrentOtp(response.pickupOtp);
            setShowDeliveryModal(false);
            setShowOtpModal(true);
            await loadOrders();
        } catch (error: any) {
            alert(error.message || 'Failed to create delivery deal');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <i className="fas fa-spinner fa-spin text-4xl text-green-600"></i>
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
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                        aria-label="Close"
                    >
                        <i className="fas fa-times text-gray-600"></i>
                    </button>
                )}
            </div>

            {/* Orders List */}
            {orders.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-box text-3xl text-gray-300"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No orders yet</h3>
                    <p className="text-sm text-gray-500">Orders will appear here when buyers purchase your crops</p>
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
                                        Buyer: {order.buyer?.name}
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
                                        {order.deliveryResponsibility === 'FARMER_ARRANGED' ? 'You Arrange' : 'Buyer Arranges'}
                                    </p>
                                </div>
                            </div>

                            {/* Delivery Actions */}
                            {order.deliveryResponsibility === 'FARMER_ARRANGED' && !order.delivery && (
                                <div className="border-t border-gray-100 pt-4 mt-4">
                                    <button
                                        onClick={() => handleArrangeDelivery(order)}
                                        className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all"
                                    >
                                        <i className="fas fa-truck mr-2"></i>
                                        Arrange Delivery
                                    </button>
                                </div>
                            )}

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

                                    {/* OTP Display */}
                                    {order.delivery.pickupOtp && order.delivery.status === 'TRANSPORTER_ASSIGNED' && (
                                        <button
                                            onClick={() => {
                                                setCurrentOtp(order.delivery!.pickupOtp!);
                                                setShowOtpModal(true);
                                            }}
                                            className="w-full bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-4 hover:bg-green-100 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <i className="fas fa-lock text-green-600 text-xl"></i>
                                                    <div className="text-left">
                                                        <p className="text-xs text-gray-600">Pickup OTP</p>
                                                        <p className="text-lg font-black text-green-600">Click to view</p>
                                                    </div>
                                                </div>
                                                <i className="fas fa-chevron-right text-green-600"></i>
                                            </div>
                                        </button>
                                    )}

                                    {/* Transporter Info */}
                                    {order.delivery.transporter && (
                                        <div className="bg-blue-50 rounded-2xl p-4">
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
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Delivery Arrangement Modal */}
            {showDeliveryModal && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Arrange Delivery</h2>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-2 block">Pickup Location</label>
                                <input
                                    type="text"
                                    value={deliveryForm.pickupAddress}
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, pickupAddress: e.target.value })}
                                    className="w-full p-4 border-2 border-gray-200 rounded-2xl font-medium focus:border-green-500 outline-none"
                                    placeholder="Your farm location"
                                    aria-label="Pickup Location"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-2 block">Drop Location</label>
                                <input
                                    type="text"
                                    value={deliveryForm.dropAddress}
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, dropAddress: e.target.value })}
                                    className="w-full p-4 border-2 border-gray-200 rounded-2xl font-medium focus:border-green-500 outline-none"
                                    placeholder="Buyer's location"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-2 block">Distance (km)</label>
                                    <input
                                        type="number"
                                        value={deliveryForm.distance}
                                        onChange={(e) => setDeliveryForm({ ...deliveryForm, distance: e.target.value })}
                                        className="w-full p-4 border-2 border-gray-200 rounded-2xl font-medium focus:border-green-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-2 block">Price/km (₹)</label>
                                    <input
                                        type="number"
                                        value={deliveryForm.pricePerKm}
                                        onChange={(e) => setDeliveryForm({ ...deliveryForm, pricePerKm: e.target.value })}
                                        className="w-full p-4 border-2 border-gray-200 rounded-2xl font-medium focus:border-green-500 outline-none"
                                        placeholder="15"
                                        aria-label="Price per KM"
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-2xl p-4">
                                <p className="text-sm font-bold text-gray-700">
                                    Total Cost: ₹{(parseFloat(deliveryForm.distance || '0') * parseFloat(deliveryForm.pricePerKm || '0')).toFixed(2)}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeliveryModal(false)}
                                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateDelivery}
                                disabled={!deliveryForm.distance || !deliveryForm.pricePerKm}
                                className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                Create Deal
                            </button>
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
        </div>
    );
};

export default FarmerOrdersView;
