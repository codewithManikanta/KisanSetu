
import React, { useState, useEffect } from 'react';
import { UserRole, Language, User, Listing, Gender } from './types';
import { SUPPORTED_LANGUAGES, TRANSLATIONS, CROPS } from './constants.tsx';
import Layout from './components/Layout';
import FarmerDashboard from './components/FarmerDashboard';
import BuyerDashboard from './components/BuyerDashboard';
import TransporterDashboard from './components/TransporterDashboard';
import ChatNegotiation from './components/ChatNegotiation';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [activeTab, setActiveTab] = useState('home');
  const [showChat, setShowChat] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [negotiationContext, setNegotiationContext] = useState({ initialOffer: 22, marketPrice: 24 });
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);

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

  const t = (key: string) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  };

  const handleOnboarding = (role: UserRole) => {
    let name = 'Ramesh Kumar';
    if (role === UserRole.BUYER) name = 'VegMart Wholesalers';
    if (role === UserRole.TRANSPORTER) name = 'Vijay Logistics';

    const newUser: User = {
      id: role === UserRole.TRANSPORTER ? 't1' : `user-${Math.random().toString(36).substr(2, 5)}`,
      phone: '9876543210',
      role,
      language,
      name,
      gender: Gender.MALE,
      email: '',
      location: {
        village: 'Kovvur',
        district: 'Guntur',
        state: 'Andhra Pradesh'
      }
    };
    setUser(newUser);
    geminiService.speak(`${t('welcome')}. Your role is ${t(newUser.role.toLowerCase())}.`);
  };

  const onUpdateProfile = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
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

  const getTransporterRating = (id: string) => {
    const transporterRatings = ratings[id] || [];
    if (transporterRatings.length === 0) return 0;
    const avg = transporterRatings.reduce((a, b) => a + b, 0) / transporterRatings.length;
    return parseFloat(avg.toFixed(1));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white p-6 flex flex-col justify-center max-w-md mx-auto">
        <div className="text-center mb-10 animate-fade-in">
          <div className="w-20 h-20 bg-green-600 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-green-200 mb-8">
            <i className="fas fa-leaf text-4xl"></i>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">{t('welcome')}</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Connecting Bharat's Farmers to the World.</p>
        </div>

        {onboardingStep === 0 && (
          <div className="space-y-6">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Choose Language</h2>
            <div className="grid grid-cols-2 gap-3">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as Language)}
                  className={`p-5 rounded-2xl border-2 transition-all font-black text-center ${language === lang.code ? 'border-green-600 bg-green-50 text-green-700 shadow-md scale-[1.02]' : 'border-gray-100 text-gray-400'}`}
                >
                  <p className="text-xl mb-1">{lang.native}</p>
                  <p className="text-[9px] uppercase opacity-60 tracking-tighter">{lang.name}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setOnboardingStep(1)}
              className="w-full bg-green-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-green-100 active:scale-95 transition-all text-lg uppercase tracking-widest"
            >
              {t('continue')}
            </button>
          </div>
        )}

        {onboardingStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{t('i_am_a')}</h2>
            <div className="grid gap-4">
              {[UserRole.FARMER, UserRole.BUYER, UserRole.TRANSPORTER].map(role => (
                <button
                  key={role}
                  onClick={() => handleOnboarding(role)}
                  className="bg-white p-6 rounded-3xl border-2 border-gray-50 hover:border-green-600 hover:bg-green-50 transition-all flex items-center gap-5 group shadow-sm"
                >
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl shadow-inner flex items-center justify-center text-2xl text-green-600 group-hover:scale-110 group-hover:bg-white transition-all">
                    <i className={`fas ${role === UserRole.FARMER ? 'fa-tractor' : role === UserRole.BUYER ? 'fa-shopping-basket' : 'fa-truck'}`}></i>
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-xl text-gray-900">{t(role.toLowerCase())}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Access {t(role.toLowerCase())} tools</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout
      userRole={user.role}
      userName={user.name}
      userLocation={`${user.location?.district}, ${user.location?.state}`}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={() => { setUser(null); setOnboardingStep(0); }}
      language={language}
    >
      {user.role === UserRole.FARMER && (
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

      {user.role === UserRole.BUYER && (
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

      {user.role === UserRole.TRANSPORTER && (
        <TransporterDashboard
          activeTab={activeTab}
          deliveries={deliveries}
          onUpdateStatus={handleDeliveryUpdate}
          user={user}
          earnings={transporterEarnings} // Pass consolidated earnings
        />
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

export default App;
