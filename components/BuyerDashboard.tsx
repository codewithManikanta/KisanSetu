
import React, { useState, useEffect } from 'react';
import { CROPS, TRANSLATIONS } from '../constants.tsx';
import { Listing, UserRole, Language, User, Gender } from '../types';
import { geminiService } from '../services/geminiService';

interface BuyerDashboardProps {
  activeTab: string;
  onNegotiate: (listing: any) => void;
  language: Language;
  user: User;
  onUpdateProfile: (updates: Partial<User>) => void;
  deliveries: any[];
  onRateTransporter: (deliveryId: string, rating: number) => void;
  onNavigate: (tab: string) => void;
  activeNegotiations?: any[];
  onDealFinalized?: (deal: any) => void;
}

const BuyerDashboard: React.FC<BuyerDashboardProps> = ({
  activeTab,
  onNegotiate,
  language,
  user,
  onUpdateProfile,
  deliveries,
  onRateTransporter,
  onNavigate,
  activeNegotiations = [],
  onDealFinalized
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCropFilter, setSelectedCropFilter] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedDeliveryToRate, setSelectedDeliveryToRate] = useState<any>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedStars, setSelectedStars] = useState(0);

  /* New business profile state */
  const [tempProfile, setTempProfile] = useState({
    name: user.name,
    gender: user.gender || Gender.MALE,
    phone: user.phone || '',
    email: user.email || '',
    village: user.location?.village || '',
    district: user.location?.district || '',
    state: user.location?.state || '',
    gstin: '29ABCDE1234F1Z5',
    businessType: 'Wholesale Trader',
    annualVolume: '500 Tons'
  });

  useEffect(() => {
    setTempProfile({
      name: user.name,
      gender: user.gender || Gender.MALE,
      phone: user.phone || '',
      email: user.email || '',
      village: user.location?.village || '',
      district: user.location?.district || '',
      state: user.location?.state || '',
      gstin: '29ABCDE1234F1Z5',
      businessType: 'Wholesale Trader',
      annualVolume: '500 Tons'
    });
  }, [user]);

  const t = (key: string) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  };

  const handleSaveProfile = () => {
    onUpdateProfile({
      name: tempProfile.name,
      gender: tempProfile.gender,
      email: tempProfile.email,
      location: { village: tempProfile.village, district: tempProfile.district, state: tempProfile.state }
    });
    setIsEditingProfile(false);
    geminiService.speak("Business account updated successfully.");
  };

  const [listings] = useState<Listing[]>([
    {
      id: 'l1', farmerId: 'f1', cropId: '1', quantity: 1200, unit: 'kg', expectedPrice: 28, mandiPrice: 24,
      grade: 'A', harvestDate: '2023-11-10', images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400'],
      status: 'AVAILABLE', location: 'Guntur, AP'
    },
    {
      id: 'l2', farmerId: 'f2', cropId: '3', quantity: 5000, unit: 'kg', expectedPrice: 18, mandiPrice: 20,
      grade: 'B', harvestDate: '2023-11-12', images: ['https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=400'],
      status: 'AVAILABLE', location: 'Kurnool, AP'
    },
    {
      id: 'l3', farmerId: 'f3', cropId: '2', quantity: 2500, unit: 'kg', expectedPrice: 25, mandiPrice: 23,
      grade: 'A', harvestDate: '2023-11-14', images: ['https://images.unsplash.com/photo-1501430654243-c934cec2e1c0?auto=format&fit=crop&q=80&w=400'],
      status: 'AVAILABLE', location: 'Nellore, AP'
    },
    {
      id: 'l4', farmerId: 'f4', cropId: '6', quantity: 800, unit: 'kg', expectedPrice: 95, mandiPrice: 85,
      grade: 'A', harvestDate: '2023-11-15', images: ['https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&q=80&w=400'],
      status: 'AVAILABLE', location: 'Ratnagiri, MH'
    }
  ]);

  const filteredListings = listings.filter(l => {
    const cropName = CROPS.find(c => c.id === l.cropId)?.name.toLowerCase() || '';
    const matchesSearch = cropName.includes(searchQuery.toLowerCase()) || l.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCrop = !selectedCropFilter || l.cropId === selectedCropFilter;
    return matchesSearch && matchesCrop;
  });

  const submitRating = () => {
    if (selectedDeliveryToRate && selectedStars > 0) {
      onRateTransporter(selectedDeliveryToRate.id, selectedStars);
      setRatingModalOpen(false);
      setSelectedStars(0);
      geminiService.speak("Rating submitted. Thank you for your feedback.");
    }
  };

  const renderTracking = (status: string) => {
    const steps = [
      { label: 'Accepted', status: 'PENDING', icon: 'fa-clipboard-check' },
      { label: 'Picked', status: 'PICKED_UP', icon: 'fa-box-open' },
      { label: 'Transit', status: 'IN_TRANSIT', icon: 'fa-truck-fast' },
      { label: 'Arrived', status: 'DELIVERED', icon: 'fa-check-circle' }
    ];
    const currentStepIndex = steps.findIndex(s => s.status === status);

    return (
      <div className="relative pt-4 pb-2">
        {/* Progress Bar Background */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full"></div>
        {/* Active Progress Bar */}
        <div
          className="absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 z-0 rounded-full transition-all duration-1000"
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        <div className="relative z-10 flex justify-between w-full">
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] transition-all duration-500 ${isCompleted ? 'bg-blue-600 text-white shadow-lg scale-100' : 'bg-white border-2 border-gray-100 text-gray-300'
                  }`}>
                  <i className={`fas ${step.icon} ${isCurrent ? 'animate-bounce' : ''}`}></i>
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest ${isCompleted ? 'text-blue-600' : 'text-gray-300'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActiveOrders = () => {
    const activeOrders = deliveries.filter(d => d.buyer === user.name && d.status !== 'DELIVERED');

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom duration-500 pb-20">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Live Deliveries</h3>
          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
            {activeOrders.length} In Transit
          </span>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-[32px] border-2 border-dashed border-gray-100 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 text-2xl mx-auto mb-4">
              <i className="fas fa-truck-fast"></i>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No active deliveries</p>
          </div>
        ) : (
          activeOrders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl">
                    {order.crop === 'Tomato' ? '🍅' : order.crop === 'Wheat' ? '🌾' : '📦'}
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-gray-900">{order.crop} Order</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: #{order.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${order.status === 'IN_TRANSIT' ? 'bg-blue-600 text-white shadow-lg' :
                    order.status === 'PICKED_UP' ? 'bg-amber-500 text-white' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Tracking UI */}
              {renderTracking(order.status)}

              <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <i className="fas fa-truck-front text-gray-400 text-xs"></i>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Transporter</p>
                    <p className="text-xs font-bold text-gray-900">{order.transporter || 'Assigning...'}</p>
                  </div>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
                  View Map
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderSearch = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md py-2 -mx-4 px-4 border-b border-gray-100">
        <div className="relative">
          <input
            type="text"
            placeholder={t('search_crops')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border-0 py-5 pl-14 pr-6 rounded-[24px] text-gray-900 font-bold shadow-sm focus:ring-4 focus:ring-green-100 transition-all outline-none"
          />
          <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
        </div>

        <div className="overflow-x-auto no-scrollbar py-4 flex gap-3">
          {CROPS.map(crop => (
            <button
              key={crop.id}
              onClick={() => setSelectedCropFilter(selectedCropFilter === crop.id ? null : crop.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all ${selectedCropFilter === crop.id ? 'bg-green-900 text-white border-green-900 shadow-lg' : 'bg-white text-gray-600 border-gray-200'
                }`}
            >
              <span className="text-lg">{crop.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{crop.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredListings.map((listing, idx) => {
          const crop = CROPS.find(c => c.id === listing.cropId);
          return (
            <div key={listing.id} className="bg-white rounded-[40px] p-2 shadow-sm border border-gray-100 hover:shadow-xl hover:border-green-100 transition-all group animate-in slide-in-from-bottom duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
              <div className="relative h-56 rounded-[32px] overflow-hidden mb-4">
                <img src={listing.images[0]} alt="Crop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                  {listing.grade} Grade
                </div>
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md py-2 px-4 rounded-2xl text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">{listing.location}</p>
                  <p className="text-lg font-black">{crop?.name}</p>
                </div>
              </div>

              <div className="px-4 pb-6">
                <div className="flex justify-between items-baseline mb-6">
                  <div>
                    <p className="text-2xl font-black text-gray-900 leading-none">₹{listing.expectedPrice}<span className="text-sm text-gray-400 font-bold ml-1">/kg</span></p>
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-1">Mandi: ₹{listing.mandiPrice}/kg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900">{listing.quantity}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available (Kg)</p>
                  </div>
                </div>

                <button
                  onClick={() => onNegotiate(listing)}
                  className="w-full bg-green-600 text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-handshake"></i> Negotiate Deal
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderNegotiations = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Price Negotiation Desk</h3>
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">{activeNegotiations.length} Open Bids</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activeNegotiations.length === 0 ? (
          <div className="bg-white p-20 rounded-[48px] border-2 border-dashed border-gray-100 text-center flex flex-col items-center gap-4">
            <i className="fas fa-comments-dollar text-gray-100 text-5xl"></i>
            <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">No active biddings</p>
          </div>
        ) : (
          activeNegotiations.map((neg, idx) => {
            const crop = CROPS.find(c => c.name === neg.cropName);
            const priceDiff = ((neg.currentOffer - neg.marketPrice) / neg.marketPrice) * 100;

            return (
              <div key={neg.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group animate-in slide-in-from-bottom duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[28px] flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                      {crop?.icon || '🌾'}
                    </div>
                    <div>
                      <h4 className="font-black text-xl text-gray-900 leading-none mb-1.5">{neg.cropName}</h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{neg.quantity} kg • {neg.updatedAt}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-gray-900 tracking-tighter">₹{neg.currentOffer}</p>
                    <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${priceDiff > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}% vs Mandi
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50/70 p-5 rounded-[28px] border border-gray-100 mb-6">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] text-gray-400 shadow-sm">
                      <i className="fas fa-comment"></i>
                    </div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Latest Message</span>
                  </div>
                  <p className="text-sm font-bold text-gray-700 italic">"{neg.lastMessage}"</p>
                </div>

                <button
                  onClick={() => onNegotiate(neg)}
                  className="w-full bg-gray-900 text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <i className="fas fa-comment-dots text-lg"></i>
                  Join Conversation
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderProfile = () => {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-500 pb-24 px-1">
        <div className="bg-white p-8 rounded-[48px] shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-5">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-900 rounded-[32px] flex items-center justify-center text-4xl font-black shadow-inner border border-blue-100">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1">{user.name}</h2>
                  <div className="flex gap-2">
                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                      <i className="fas fa-certificate mr-1"></i> Verified
                    </span>
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                      Pro Buyer
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => isEditingProfile ? handleSaveProfile() : setIsEditingProfile(true)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest shadow-sm ${isEditingProfile ? 'bg-green-500 text-white shadow-green-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                <i className={`fas ${isEditingProfile ? 'fa-check' : 'fa-cog'}`}></i>
                {isEditingProfile ? 'Save Changes' : 'Manage Profile'}
              </button>
            </div>

            <div className="space-y-6">
              {/* Business Details Section */}
              <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 backdrop-blur-sm">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <i className="fas fa-building"></i> Business Information
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Legal Name */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Legal Trading Name</label>
                    {isEditingProfile ? (
                      <input type="text" value={tempProfile.name} onChange={e => setTempProfile({ ...tempProfile, name: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" />
                    ) : (
                      <p className="text-sm font-black text-gray-900">{user.name}</p>
                    )}
                  </div>

                  {/* Business Type */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Business Type</label>
                    {isEditingProfile ? (
                      <select value={tempProfile.businessType} onChange={e => setTempProfile({ ...tempProfile, businessType: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                        <option>Retailer</option>
                        <option>Wholesale Trader</option>
                        <option>Food Processor</option>
                        <option>Exporter</option>
                      </select>
                    ) : (
                      <p className="text-sm font-black text-gray-900">{tempProfile.businessType}</p>
                    )}
                  </div>

                  {/* GSTIN */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">GSTIN / License</label>
                    {isEditingProfile ? (
                      <input type="text" value={tempProfile.gstin} onChange={e => setTempProfile({ ...tempProfile, gstin: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" />
                    ) : (
                      <p className="text-sm font-black text-gray-900 font-mono tracking-tight">{tempProfile.gstin}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact & Location Section */}
              <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 backdrop-blur-sm">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <i className="fas fa-map-marked-alt"></i> Contact & Location
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Registered Email</label>
                    {isEditingProfile ? (
                      <input type="email" value={tempProfile.email} onChange={e => setTempProfile({ ...tempProfile, email: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" />
                    ) : (
                      <p className="text-sm font-black text-gray-900">{user.email || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                    <p className="text-sm font-black text-gray-900">{user.phone || '+91 91234 56789'}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200/50 grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">District</label>
                    {isEditingProfile ? (
                      <input type="text" value={tempProfile.district} onChange={e => setTempProfile({ ...tempProfile, district: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" />
                    ) : (
                      <p className="text-sm font-black text-gray-900">{user.location?.district || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">State</label>
                    {isEditingProfile ? (
                      <input type="text" value={tempProfile.state} onChange={e => setTempProfile({ ...tempProfile, state: e.target.value })} className="w-full p-3 bg-white rounded-xl font-bold text-gray-900 text-sm border focus:ring-2 focus:ring-blue-500 outline-none" />
                    ) : (
                      <p className="text-sm font-black text-gray-900">{user.location?.state || '—'}</p>
                    )}
                  </div>
                </div>
              </div>


              {/* Buying Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <i className="fas fa-shopping-basket text-6xl text-blue-600"></i>
                  </div>
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Procurement</p>
                  <p className="text-3xl font-black text-blue-900">{deliveries.length} <span className="text-sm font-bold opacity-60">Loads</span></p>
                </div>
                <div className="bg-green-50 p-6 rounded-[32px] border border-green-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <i className="fas fa-hand-holding-dollar text-6xl text-green-600"></i>
                  </div>
                  <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Active Deals</p>
                  <p className="text-3xl font-black text-green-900">{activeNegotiations.length} <span className="text-sm font-bold opacity-60">Open</span></p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pt-6 w-full mx-auto min-h-screen relative">
      {activeTab === 'home' && renderSearch()}
      {activeTab === 'orders' && renderActiveOrders()}
      {activeTab === 'profile' && renderProfile()}
      {activeTab === 'chats' && renderNegotiations()}

      {ratingModalOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[28px] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
                <i className="fas fa-star"></i>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Delivery Service</h3>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Please rate the logistics partner for your {selectedDeliveryToRate?.crop} order.</p>
            </div>

            <div className="flex justify-center gap-3 mb-12">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setSelectedStars(star)}
                  className="text-5xl transition-all active:scale-75"
                >
                  <i className={`fas fa-star ${(hoverRating || selectedStars) >= star ? 'text-amber-400' : 'text-gray-100'
                    }`}></i>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setRatingModalOpen(false)}
                className="bg-gray-50 text-gray-400 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
              >
                Skip
              </button>
              <button
                disabled={selectedStars === 0}
                onClick={submitRating}
                className="bg-gray-900 text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-20"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerDashboard;
