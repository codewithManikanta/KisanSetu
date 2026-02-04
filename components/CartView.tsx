import React, { useState, useEffect } from 'react';
import { Cart, CartItem } from '../types';
import { cartAPI } from '../services/api';
import StatusBadge from './StatusBadge';

interface CartViewProps {
    onCheckoutComplete?: () => void;
}

const CartView: React.FC<CartViewProps> = ({ onCheckoutComplete }) => {
    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [deliveryOption, setDeliveryOption] = useState<'FARMER_ARRANGED' | 'BUYER_ARRANGED'>('FARMER_ARRANGED');
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);

    useEffect(() => {
        loadCart();
    }, []);

    const loadCart = async () => {
        try {
            setLoading(true);
            const response = await cartAPI.get();
            setCart(response.cart);
        } catch (error) {
            console.error('Failed to load cart:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
        if (newQuantity < 1) return;

        try {
            await cartAPI.update(itemId, newQuantity);
            await loadCart();
        } catch (error: any) {
            alert(error.message || 'Failed to update quantity');
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!confirm('Remove this item from cart?')) return;

        try {
            await cartAPI.remove(itemId);
            await loadCart();
        } catch (error: any) {
            alert(error.message || 'Failed to remove item');
        }
    };

    const handleCheckout = async () => {
        try {
            setCheckoutLoading(true);
            await cartAPI.checkout(deliveryOption);
            setShowCheckoutModal(false);
            alert('Order placed successfully!');
            await loadCart();
            if (onCheckoutComplete) onCheckoutComplete();
        } catch (error: any) {
            alert(error.message || 'Checkout failed');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const calculateTotal = () => {
        if (!cart?.items) return 0;
        return cart.items.reduce((total, item) => {
            return total + (item.listing?.expectedPrice || 0) * item.quantity;
        }, 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-4xl text-green-600 mb-4"></i>
                    <p className="text-sm font-bold text-gray-500">Loading cart...</p>
                </div>
            </div>
        );
    }

    const items = cart?.items || [];
    const total = calculateTotal();

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Shopping Cart</h2>
                    <p className="text-sm text-gray-500 mt-1">{items.length} items</p>
                </div>
                {items.length > 0 && (
                    <button
                        onClick={() => setShowCheckoutModal(true)}
                        className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-green-700 active:scale-95 transition-all"
                    >
                        Checkout • ₹{total.toLocaleString()}
                    </button>
                )}
            </div>

            {/* Cart Items */}
            {items.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-shopping-cart text-3xl text-gray-300"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Your cart is empty</h3>
                    <p className="text-sm text-gray-500">Browse listings and add items to get started</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {items.map((item) => (
                        <div key={item.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <div className="flex gap-6">
                                {/* Image */}
                                {item.listing?.images && item.listing.images[0] && (
                                    <img
                                        src={item.listing.images[0]}
                                        alt={item.listing.crop?.name}
                                        className="w-24 h-24 rounded-2xl object-cover"
                                    />
                                )}

                                {/* Details */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900">
                                                {item.listing?.crop?.name || 'Crop'}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {item.listing?.location} • Grade {item.listing?.grade}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Farmer: {item.listing?.farmer?.name}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            <i className="fas fa-trash text-sm"></i>
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
                                            >
                                                <i className="fas fa-minus text-xs text-gray-600"></i>
                                            </button>
                                            <div className="text-center min-w-[60px]">
                                                <p className="text-lg font-black text-gray-900">{item.quantity}</p>
                                                <p className="text-xs text-gray-400">kg</p>
                                            </div>
                                            <button
                                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
                                            >
                                                <i className="fas fa-plus text-xs text-gray-600"></i>
                                            </button>
                                        </div>

                                        {/* Price */}
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-gray-900">
                                                ₹{((item.listing?.expectedPrice || 0) * item.quantity).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                ₹{item.listing?.expectedPrice}/kg
                                            </p>
                                        </div>
                                    </div>

                                    {/* Locked indicator */}
                                    {item.lockedAt && (
                                        <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                                            <i className="fas fa-lock"></i>
                                            <span>Quantity locked</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Checkout Modal */}
            {showCheckoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Checkout</h2>

                        {/* Order Summary */}
                        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                            <div className="space-y-2 mb-4 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                {items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">
                                            {item.listing?.crop?.name} ({item.quantity}kg)
                                        </span>
                                        <span className="font-bold text-gray-900">
                                            ₹{((item.listing?.expectedPrice || 0) * item.quantity).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                <span className="text-lg font-black text-gray-900">Total Pay</span>
                                <span className="text-2xl font-black text-green-600">₹{total.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Delivery Option */}
                        <div className="mb-6">
                            <label className="text-sm font-bold text-gray-700 mb-3 block">
                                Who will arrange delivery?
                            </label>
                            <div className="space-y-3">
                                <button
                                    onClick={() => setDeliveryOption('FARMER_ARRANGED')}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${deliveryOption === 'FARMER_ARRANGED'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${deliveryOption === 'FARMER_ARRANGED' ? 'border-green-500' : 'border-gray-300'
                                            }`}>
                                            {deliveryOption === 'FARMER_ARRANGED' && (
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Farmer Arranged</p>
                                            <p className="text-xs text-gray-500">Farmer will handle delivery</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setDeliveryOption('BUYER_ARRANGED')}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${deliveryOption === 'BUYER_ARRANGED'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${deliveryOption === 'BUYER_ARRANGED' ? 'border-green-500' : 'border-gray-300'
                                            }`}>
                                            {deliveryOption === 'BUYER_ARRANGED' && (
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">I'll Arrange</p>
                                            <p className="text-xs text-gray-500">You will handle delivery</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCheckoutModal(false)}
                                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCheckout}
                                disabled={checkoutLoading}
                                className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {checkoutLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Processing...
                                    </span>
                                ) : (
                                    'Place Order'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartView;
