
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Language, User, Listing, Gender } from '../types';
import { SUPPORTED_LANGUAGES, TRANSLATIONS, CROPS } from '../constants.tsx';
import Layout from '../components/Layout';
import FarmerDashboard from '../components/FarmerDashboard';
import BuyerDashboard from '../components/BuyerDashboard';
import TransporterDashboard from '../components/TransporterDashboard';
import ChatNegotiation from '../components/ChatNegotiation';
import { geminiService } from '../services/geminiService';

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth(); // Use AuthContext
    const [activeTab, setActiveTab] = useState('home');
    const [showChat, setShowChat] = useState(false);
    const [negotiationContext, setNegotiationContext] = useState({ initialOffer: 22, marketPrice: 24 });
    const [language, setLanguage] = useState<Language>(Language.ENGLISH);
    // We might want to persist language in user profile or context, but local state fine for now if initialized from user

    useEffect(() => {
        if (user?.language) {
            // @ts-ignore
            setLanguage(user.language);
        }
    }, [user]);

    const [acceptedDeals, setAcceptedDeals] = useState<any[]>([
        { id: 'deal-101', buyer: 'Reliance Retail', crop: 'Mango', price: 85, qty: 200, listingId: 'm-1', date: 'Today' }
    ]);

    // Track ongoing negotiations that haven't become "Deals" yet
    const [activeNegotiations, setActiveNegotiations] = useState<any[]>([
        { id: 'neg-1', cropName: 'Tomato', buyerName: 'VegMart Wholesalers', currentOffer: 32, marketPrice: 28, quantity: 1200, lastMessage: 'Waiting for your counter-offer...', status: 'OPEN', updatedAt: '10 mins ago' },
        { id: 'neg-2', cropName: 'Wheat', buyerName: 'Reliance Retail', currentOffer: 24, marketPrice: 23, quantity: 2500, lastMessage: 'Quality looks good in photos.', status: 'OPEN', updatedAt: '1h ago' }
    ]);

    // Unified global deliveries state with Buyer names included for Ledger clarity
    const [deliveries, setDeliveries] = useState<any[]>([
        { id: 'del-1', crop: 'Tomato', status: 'IN_TRANSIT', transporter: 'Vijay Logistics', transporterId: 't1', buyer: 'VegMart Wholesalers', destination: 'Vijayawada Market', pickupAddress: 'Kovvur', cost: 1800, rating: 0, date: '14 Nov' },
        { id: 'del-2', crop: 'Rice', status: 'PENDING', transporter: 'Vijay Logistics', transporterId: 't1', buyer: 'Reliance Retail', destination: 'Guntur Wholesalers', pickupAddress: 'Tenali', cost: 4500, rating: 0, date: '15 Nov' },
        { id: 'del-3', crop: 'Wheat', status: 'DELIVERED', transporter: 'Vijay Logistics', transporterId: 't1', buyer: 'VegMart Wholesalers', destination: 'Vijayawada Market', pickupAddress: 'Tenali', cost: 2400, rating: 5, date: '12 Nov' },
        { id: 'del-4', crop: 'Mango', status: 'DELIVERED', transporter: 'Vijay Logistics', transporterId: 't1', buyer: 'FreshDirect', destination: 'Mumbai Terminal', pickupAddress: 'Ratnagiri', cost: 12500, rating: 4, date: '10 Nov' }
    ]);

    // Transporter ratings state
    const [ratings, setRatings] = useState<Record<string, number[]>>({
        't1': [5, 4, 5, 5, 4] // Seed initial ratings for Vijay Logistics
    });

    // Financial State
    const [farmerEarnings, setFarmerEarnings] = useState({ total: 155400, pending: 12500 });
    const [transporterEarnings, setTransporterEarnings] = useState({ total: 45000, pending: 1800 });

    if (!user) return null; // Should be handled by ProtectedRoute

    const t = (key: string) => {
        return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
    };

    const onUpdateProfile = (updates: Partial<User>) => {
        // setUser(prev => prev ? { ...prev, ...updates } : null);
        // In real app, call API then update context
    };

    const handleDealFinalized = (deal: any) => {
        // 1. Add to Accepted Deals (for Farmer & Buyer history)
        const newDeal = {
            id: `deal-${Date.now()}`,
            buyer: deal.buyerName,
            crop: deal.cropName,
            price: deal.finalPrice,
            qty: deal.quantity,
            listingId: deal.listingId,
            date: 'Just now'
        };
        setAcceptedDeals(prev => [newDeal, ...prev]);

        // 2. Create a Delivery Job (OPEN_FOR_TRANSIT)
        const newDelivery = {
            id: `del-${Date.now()}`,
            crop: deal.cropName,
            status: 'OPEN_FOR_TRANSIT', // New status for Marketplace
            transporter: null, // Initially unassigned
            transporterId: null,
            buyer: deal.buyerName,
            destination: 'Vijayawada Market', // Mock destination
            pickupAddress: 'Kovvur',
            cost: Math.round(deal.quantity * 1.5), // Mock transport cost calc
            rating: 0,
            date: 'Today'
        };
        setDeliveries(prev => [newDelivery, ...prev]);

        // 3. Remove from Active Negotiations
        setActiveNegotiations(prev => prev.filter(n => n.id !== deal.id));

        geminiService.speak(`Deal confirmed for ${deal.cropName}. Delivery job posted for transporters.`);
    };

    const handleDeliveryUpdate = (id: string, status: string, transporterId?: string) => {
        setDeliveries(prev => prev.map(d => {
            if (d.id === id) {
                // If accepting a job, assign the transporter
                if (status === 'ACCEPTED' && transporterId) {
                    return { ...d, status: 'PENDING', transporter: 'Vijay Logistics', transporterId }; // Mock name
                }
                return { ...d, status };
            }
            return d;
        }));

        // If Delivered, Update Earnings
        if (status === 'DELIVERED') {
            const delivery = deliveries.find(d => d.id === id);
            if (delivery) {
                // Update Transporter Earnings
                setTransporterEarnings(prev => ({
                    ...prev,
                    total: prev.total + delivery.cost
                }));

                // Update Farmer Earnings (find the deal value)
                // Simplified: Assuming we can find the deal val or use a mock logic
                // Ideally we link Delivery -> Deal. For now, we simulate payout.
                setFarmerEarnings(prev => ({
                    ...prev,
                    total: prev.total + 50000, // Mock crop value addition
                    pending: Math.max(0, prev.pending - 5000)
                }));

                geminiService.speak("Delivery confirmed. Payment released to Farmer and Transporter wallets.");
            }
        }
    };

    const handleRateTransporter = (deliveryId: string, rating: number) => {
        const delivery = deliveries.find(d => d.id === deliveryId);
        if (!delivery) return;

        setDeliveries(prev => prev.map(d => d.id === deliveryId ? { ...d, rating } : d));

        const tid = delivery.transporterId;
        if (tid) {
            setRatings(prev => ({
                ...prev,
                [tid]: [...(prev[tid] || []), rating]
            }));
        }
    };

    // @ts-ignore
    const userRole: UserRole = user.role;

    return (
        <Layout
            userRole={userRole}
            userName={user.name || user.email}
            // @ts-ignore
            userLocation={user.location ? `${user.location.district}, ${user.location.state}` : ''}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={logout}
            language={language}
        >
            {userRole === 'FARMER' && (
                <FarmerDashboard
                    activeTab={activeTab}
                    onViewOffers={() => setActiveTab('chats')}
                    acceptedDeals={acceptedDeals}
                    onAddDelivery={(d) => setDeliveries([...deliveries, d])}
                    onDealHandled={() => { }} // Placeholder
                    user={user}
                    onUpdateProfile={onUpdateProfile}
                    language={language}
                    earnings={farmerEarnings} // Pass centralized earnings
                />
            )}

            {userRole === 'BUYER' && (
                <BuyerDashboard
                    activeTab={activeTab}
                    onNavigate={(tab) => {
                        if (tab === 'chat') {
                            setShowChat(true);
                        } else {
                            setActiveTab(tab);
                        }
                    }}
                    activeNegotiations={activeNegotiations}
                    deliveries={deliveries}
                    onRateTransporter={handleRateTransporter}
                    user={user}
                    onDealFinalized={handleDealFinalized} // Pass deal handler
                />
            )}

            {userRole === 'TRANSPORTER' && (
                <TransporterDashboard
                    activeTab={activeTab}
                    deliveries={deliveries}
                    onUpdateStatus={handleDeliveryUpdate}
                    user={user}
                    earnings={transporterEarnings} // Pass consolidated earnings
                />
            )}

            {userRole === 'ADMIN' && (
                <div className="p-8">Admin Dashboard Placeholder</div>
            )}

            {showChat && (
                <div className="fixed inset-0 z-50 bg-white animate-in slide-in-from-bottom duration-300">
                    <ChatNegotiation
                        onClose={() => setShowChat(false)}
                        onDealFinalized={(deal) => { // Connect Chat to App State Logic
                            handleDealFinalized(deal);
                            setShowChat(false);
                        }}
                    />
                </div>
            )}
        </Layout>
    );
};

export default Dashboard;
