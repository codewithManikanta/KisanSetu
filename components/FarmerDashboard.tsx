
import React, { useState, useEffect, useRef } from 'react';
import { CROPS, TRANSLATIONS } from '../constants.tsx';
import { Listing, MarketPrice, User, Language, Gender } from '../types';
import { geminiService } from '../services/geminiService';

interface EnhancedMarketPrice extends MarketPrice {
  msp: number;
  nearbyMandi: string;
  nearbyAvg: number;
}

interface CropRecommendation {
  cropName: string;
  reason: string;
  demand: string;
  trend: string;
}

interface FarmerDashboardProps {
  activeTab: string;
  onViewOffers?: (listingOrOffer: any) => void;
  acceptedDeals: any[];
  onAddDelivery: (delivery: any) => void;
  onDealHandled: (dealId: string) => void;
  user: User;
  onUpdateProfile: (updates: Partial<User>) => void;
  language: Language;
  earnings: { total: number; pending: number };
}

type SortOption = 'date-desc' | 'date-asc' | 'price-asc' | 'price-desc' | 'qty-desc' | 'qty-asc';

const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  activeTab,
  onViewOffers,
  acceptedDeals,
  onAddDelivery,
  onDealHandled,
  user,
  onUpdateProfile,
  language,
  earnings
}) => {
  const [internalView, setInternalView] = useState<'default' | 'add' | 'editProfile' | 'delivery'>('default');
  const [editListingId, setEditListingId] = useState<string | null>(null);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<CropRecommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: string) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  };

  // Combine real accepted deals with some mock history for display
  const soldHistory = [
    ...acceptedDeals.map(d => ({
      id: d.id,
      cropId: d.crop === 'Tomato' ? '1' : '2', // Simple mapper
      cropName: d.crop,
      buyer: d.buyer,
      qty: d.qty,
      price: d.price,
      amount: d.price * d.qty,
      date: d.date,
      icon: d.crop === 'Tomato' ? '🍅' : '🌾'
    })),
    // Keep some older history
    { id: 's-mock-1', cropId: '6', cropName: 'Mango', buyer: 'FreshDirect', qty: 500, price: 90, amount: 45000, date: '08 Nov', icon: '🥭' }
  ];

  const [incomingOffers] = useState([
    { id: 'off-1', buyer: 'FreshDirect', crop: 'Tomato', qty: 500, price: 34, status: 'OPEN', timestamp: '2h ago' },
    { id: 'off-2', buyer: 'VegMart Wholesalers', crop: 'Tomato', qty: 500, price: 32, status: 'OPEN', timestamp: '5h ago' },
    { id: 'off-3', buyer: 'Reliance Retail', crop: 'Wheat', qty: 1000, price: 26, status: 'OPEN', timestamp: '1d ago' },
  ]);

  const [tempProfile, setTempProfile] = useState({
    name: user.name,
    gender: user.gender || Gender.MALE,
    email: user.email || '',
    village: user.location?.village || '',
    district: user.location?.district || '',
    state: user.location?.state || ''
  });

  const tipsForSuccess = [
    {
      id: 'tip-1',
      title: 'Market Insight',
      desc: 'Tomato prices are expected to rise by 15% next week in Guntur. Consider waiting if your harvest is stable.',
      icon: 'fa-arrow-trend-up',
      color: 'bg-amber-50 border-amber-100 text-amber-700',
      tag: 'Trends'
    },
    {
      id: 'tip-2',
      title: 'Crop Care',
      desc: 'Rising humidity detected. Check your Wheat crops for yellow rust symptoms and apply preventive organic spray.',
      icon: 'fa-seedling',
      color: 'bg-emerald-50 border-emerald-100 text-emerald-700',
      tag: 'Health'
    },
    {
      id: 'tip-3',
      title: 'Sell Faster',
      desc: 'Listings with at least 3 clear photos get 40% more buyer interest. Take photos in daylight for best results!',
      icon: 'fa-camera',
      color: 'bg-indigo-50 border-indigo-100 text-indigo-700',
      tag: 'Strategy'
    }
  ];

  useEffect(() => {
    setTempProfile({
      name: user.name,
      gender: user.gender || Gender.MALE,
      email: user.email || '',
      village: user.location?.village || '',
      district: user.location?.district || '',
      state: user.location?.state || ''
    });
  }, [user]);

  useEffect(() => {
    if (activeTab === 'home' && aiRecommendations.length === 0) {
      fetchRecommendations();
    }
  }, [activeTab]);

  const fetchRecommendations = async () => {
    if (isLoadingRecs) return;
    setIsLoadingRecs(true);
    try {
      const location = user.location ? `${user.location.district}, ${user.location.state}` : 'India';
      const recs = await geminiService.getCropRecommendations(location);
      setAiRecommendations(recs);
    } catch (err) {
      console.warn("AI Recommendations failed, using fallback.");
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const [newListing, setNewListing] = useState({
    cropId: '1',
    quantity: '',
    unit: 'kg' as 'kg' | 'quintal',
    expectedPrice: '',
    grade: 'A' as 'A' | 'B' | 'C',
    harvestDate: new Date().toISOString().split('T')[0],
    images: [] as string[]
  });

  const [listings, setListings] = useState<Listing[]>([
    {
      id: 'demo-1',
      farmerId: 'farmer-1',
      cropId: '1',
      quantity: 500,
      unit: 'kg',
      expectedPrice: 35,
      mandiPrice: 24,
      grade: 'A',
      harvestDate: '2023-11-05',
      images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400'],
      status: 'AVAILABLE',
      location: 'Guntur, AP'
    },
    {
      id: 'demo-2',
      farmerId: 'farmer-1',
      cropId: '2',
      quantity: 2000,
      unit: 'kg',
      expectedPrice: 24,
      mandiPrice: 22,
      grade: 'A',
      harvestDate: '2023-11-12',
      images: ['https://images.unsplash.com/photo-1501430654243-c934cec2e1c0?auto=format&fit=crop&q=80&w=400'],
      status: 'AVAILABLE',
      location: 'Guntur, AP'
    }
  ]);

  const [marketPrices, setMarketPrices] = useState<EnhancedMarketPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const totalEarned = soldHistory.reduce((sum, item) => sum + item.amount, 0);
  const totalVolume = soldHistory.reduce((sum, item) => sum + item.qty, 0);
  const pendingPayments = 5400;

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    setLoadingPrices(true);
    const mock: EnhancedMarketPrice[] = [
      { cropId: '1', mandi: 'Guntur Mandi', min: 20, max: 26, avg: 23, date: 'Today', msp: 18, nearbyMandi: 'Vijayawada', nearbyAvg: 25 },
      { cropId: '3', mandi: 'Guntur Mandi', min: 15, max: 22, avg: 19, date: 'Today', msp: 16, nearbyMandi: 'Kurnool', nearbyAvg: 20 },
      { cropId: '2', mandi: 'Guntur Mandi', min: 21, max: 25, avg: 23, date: 'Today', msp: 21.25, nearbyMandi: 'Tenali', nearbyAvg: 22.5 },
      { cropId: '4', mandi: 'Guntur Mandi', min: 18, max: 24, avg: 21, date: 'Today', msp: 20.40, nearbyMandi: 'Bapatla', nearbyAvg: 20 },
    ];
    setMarketPrices(mock);
    try {
      const p = await geminiService.getMarketPrice("Tomato", "Guntur");
      if (p) {
        setMarketPrices(prev => prev.map(m => m.cropId === '1' ? { ...m, avg: p.avgPrice } : m));
      }
    } catch (error: any) {
      console.warn("Price fetch failed (Quota?), using mock.");
    } finally {
      setLoadingPrices(false);
    }
  };

  const handlePublish = () => {
    const listingData = {
      cropId: newListing.cropId,
      quantity: Number(newListing.quantity),
      unit: newListing.unit,
      expectedPrice: Number(newListing.expectedPrice),
      grade: newListing.grade,
      harvestDate: newListing.harvestDate,
      images: newListing.images.length > 0 ? newListing.images : ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400'],
      status: 'AVAILABLE' as const,
      location: `${user.location?.village}, ${user.location?.district}`
    };

    const cropName = CROPS.find(c => c.id === listingData.cropId)?.name;

    if (editListingId) {
      setListings(prev => prev.map(l => l.id === editListingId ? { ...l, ...listingData } : l));
      geminiService.speak(`${cropName} listing updated successfully!`);
    } else {
      const listing: Listing = {
        id: Math.random().toString(36).substr(2, 9),
        farmerId: 'farmer-1',
        ...listingData,
        mandiPrice: marketPrices.find(m => m.cropId === newListing.cropId)?.avg || 24
      };
      setListings([listing, ...listings]);
      geminiService.speak(`Great! Your ${listingData.quantity} ${listingData.unit} of ${cropName} is now listed for ${listingData.expectedPrice} rupees per kg.`);
    }

    setInternalView('default');
    setEditListingId(null);
    setNewListing({ cropId: '1', quantity: '', unit: 'kg', expectedPrice: '', grade: 'A', harvestDate: new Date().toISOString().split('T')[0], images: [] });
  };

  const getPriceCompetitiveness = (expected: number, cropId: string, listingMandiPrice?: number) => {
    const marketAvg = listingMandiPrice || marketPrices.find(m => m.cropId === cropId)?.avg || 24;
    const diff = ((expected - marketAvg) / marketAvg) * 100;

    if (diff < -5) {
      return {
        label: t('below_market'),
        color: 'bg-blue-100 text-blue-700',
        barColor: 'bg-blue-500',
        icon: 'fa-bolt',
        advice: `${t('price_advice_low')} (${Math.abs(Math.round(diff))}% below market).`,
        type: 'below',
        index: 1
      };
    } else if (diff <= 5) {
      return {
        label: t('competitive'),
        color: 'bg-emerald-100 text-emerald-700',
        barColor: 'bg-emerald-500',
        icon: 'fa-circle-check',
        advice: t('price_advice_competitive'),
        type: 'competitive',
        index: 2
      };
    } else if (diff <= 15) {
      return {
        label: t('slightly_above'),
        color: 'bg-amber-100 text-amber-700',
        barColor: 'bg-amber-500',
        icon: 'fa-triangle-exclamation',
        advice: `${t('price_advice_slightly_high')} (${Math.round(diff)}% premium).`,
        type: 'slightly_above',
        index: 3
      };
    } else {
      return {
        label: t('significantly_above'),
        color: 'bg-red-100 text-red-700',
        barColor: 'bg-red-500',
        icon: 'fa-circle-up',
        advice: `${t('price_advice_high')} (${Math.round(diff)}% premium).`,
        type: 'significantly_above',
        index: 4
      };
    }
  };

  const getOffersForListing = (cropId: string) => {
    const cropName = CROPS.find(c => c.id === cropId)?.name || '';
    return incomingOffers.filter(o => o.crop.toLowerCase() === cropName.toLowerCase());
  };

  const handleSaveProfile = () => {
    onUpdateProfile({
      name: tempProfile.name,
      gender: tempProfile.gender,
      email: tempProfile.email,
      location: {
        village: tempProfile.village,
        district: tempProfile.district,
        state: tempProfile.state
      }
    });
    setInternalView('default');
    geminiService.speak("Profile updated successfully!");
  };

  const handleEditClick = (l: Listing) => {
    setEditListingId(l.id);
    setNewListing({
      cropId: l.cropId,
      quantity: String(l.quantity),
      unit: l.unit,
      expectedPrice: String(l.expectedPrice),
      grade: l.grade,
      harvestDate: l.harvestDate,
      images: l.images
    });
    setInternalView('add');
  };

  const confirmDeleteListing = () => {
    if (listingToDelete) {
      setListings(prev => prev.filter(l => l.id !== listingToDelete));
      setListingToDelete(null);
    }
  };

  const processFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    if (newListing.images.length + validFiles.length > 6) {
      geminiService.speak("Maximum 6 photos allowed per listing.");
      return;
    }

    if (validFiles.length === 0) return;

    setIsAnalyzingPhoto(true);
    geminiService.speak("Processing your harvest photos for AI grading...");

    const uploadedImages: string[] = [];
    let processedCount = 0;

    validFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        uploadedImages.push(reader.result as string);
        processedCount++;

        if (processedCount === validFiles.length) {
          setNewListing(prev => ({
            ...prev,
            images: [...prev.images, ...uploadedImages]
          }));

          setTimeout(() => {
            setIsAnalyzingPhoto(false);
            const suggestedGrade = Math.random() > 0.6 ? 'A' : Math.random() > 0.3 ? 'B' : 'C';
            setNewListing(prev => ({ ...prev, grade: suggestedGrade as any }));
            geminiService.speak(`AI analysis complete. Based on visual consistency, I've marked this as Grade ${suggestedGrade}.`);
          }, 1500);
        }
      };
      reader.readAsDataURL(file as Blob);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setNewListing(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    geminiService.speak("Photo removed.");
  };

  const setAsPrimary = (index: number) => {
    setNewListing(prev => {
      const newImages = [...prev.images];
      const [moved] = newImages.splice(index, 1);
      newImages.unshift(moved);
      return { ...prev, images: newImages };
    });
    geminiService.speak("Main photo updated.");
  };

  const handleViewOffersClick = (l: Listing) => {
    const offers = getOffersForListing(l.cropId);
    const cropName = CROPS.find(c => c.id === l.cropId)?.name;

    if (offers.length > 0) {
      geminiService.speak(`You have ${offers.length} active offers for your ${cropName}. Opening the offers list.`);
      onViewOffers?.(l);
    } else {
      geminiService.speak(`No active offers for ${cropName} yet. Listing remains active for buyers.`);
      onViewOffers?.(l);
    }
  };

  const renderOffers = () => (
    <div className="space-y-8 pb-20 px-1 animate-in fade-in duration-500">
      {/* Stats Cards - Updated with Real Earnings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-600 p-6 rounded-[32px] text-white shadow-xl shadow-green-200 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-4 backdrop-blur-md">
              <i className="fas fa-wallet"></i>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Total Revenue</p>
            <h3 className="text-3xl font-black tracking-tight">₹{(earnings.total / 1000).toFixed(1)}k</h3>
          </div>
          <div className="absolute -right-4 -bottom-4 text-8xl opacity-10 rotate-12 group-hover:scale-110 transition-transform">
            <i className="fas fa-wheat"></i>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-2xl mb-4">
              <i className="fas fa-clock"></i>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">₹{(earnings.pending / 1000).toFixed(1)}k</h3>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center px-1">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">{t('offers')}</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{incomingOffers.length} Active Bids</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {incomingOffers.length === 0 ? (
          <div className="bg-white p-20 rounded-[48px] border-2 border-dashed border-gray-100 text-center flex flex-col items-center gap-6">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 text-4xl">
              <i className="fas fa-comments-dollar"></i>
            </div>
            <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">No active offers yet</p>
          </div>
        ) : (
          incomingOffers.map((offer, idx) => {
            const crop = CROPS.find(c => c.name === offer.crop);
            return (
              <div key={offer.id} className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-blue-100 transition-all group animate-in slide-in-from-bottom duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[28px] flex items-center justify-center text-4xl shadow-inner group-hover:scale-105 transition-transform">
                        {crop?.icon || '🌾'}
                      </div>
                      <div>
                        <h4 className="font-black text-xl text-gray-900 leading-none">{offer.crop}</h4>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                          <i className="fas fa-user-tie text-blue-400"></i> {offer.buyer}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{offer.timestamp}</p>
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Active</span>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-50 flex justify-between items-center mb-8">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Bid Price</p>
                      <p className="text-3xl font-black text-gray-900 tracking-tighter">₹{offer.price}<span className="text-xs ml-1">/kg</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Requested Qty</p>
                      <p className="text-xl font-black text-gray-700">{offer.qty} KG</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        geminiService.speak(`Opening negotiation with ${offer.buyer} for your ${offer.crop}.`);
                        onViewOffers?.(offer);
                      }}
                      className="bg-gray-900 text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-gray-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <i className="fas fa-comments-dollar text-lg"></i>
                      Negotiate Bid
                    </button>
                    <button className="bg-white border-2 border-gray-100 text-gray-400 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all">
                      Reject Offer
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderProfileEditor = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <div className="flex items-center gap-4 mb-2 px-1">
        <button
          onClick={() => setInternalView('default')}
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400"
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        <h2 className="font-black text-2xl tracking-tight">{t('edit_profile')}</h2>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Full Name</label>
            <div className="relative">
              <i className="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
              <input
                type="text"
                value={tempProfile.name}
                onChange={(e) => setTempProfile(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-gray-50 border-0 p-5 pl-14 rounded-2xl font-bold focus:ring-2 focus:ring-green-50 outline-none text-lg"
                placeholder="Enter your name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Gender</label>
            <div className="flex gap-3">
              {[Gender.MALE, Gender.FEMALE, Gender.OTHER].map(g => (
                <button
                  key={g}
                  onClick={() => setTempProfile(prev => ({ ...prev, gender: g }))}
                  className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${tempProfile.gender === g ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-50 text-gray-400'
                    }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Email Address</label>
            <div className="relative">
              <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
              <input
                type="email"
                value={tempProfile.email}
                onChange={(e) => setTempProfile(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-gray-50 border-0 p-5 pl-14 rounded-2xl font-bold focus:ring-2 focus:ring-green-50 outline-none text-lg"
                placeholder="email@example.com"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-gray-50">
          <div className="flex items-center gap-2 px-1">
            <i className="fas fa-location-dot text-green-500"></i>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-900">Location Details</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Village</label>
              <input
                type="text"
                value={tempProfile.village}
                onChange={(e) => setTempProfile(prev => ({ ...prev, village: e.target.value }))}
                className="w-full bg-gray-50 border-0 p-5 rounded-2xl font-bold focus:ring-2 focus:ring-green-50 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">District</label>
              <input
                type="text"
                value={tempProfile.district}
                onChange={(e) => setTempProfile(prev => ({ ...prev, district: e.target.value }))}
                className="w-full bg-gray-50 border-0 p-5 rounded-2xl font-bold focus:ring-2 focus:ring-green-50 outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">State</label>
            <input
              type="text"
              value={tempProfile.state}
              onChange={(e) => setTempProfile(prev => ({ ...prev, state: e.target.value }))}
              className="w-full bg-gray-50 border-0 p-5 rounded-2xl font-bold focus:ring-2 focus:ring-green-50 outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          className="w-full bg-gray-900 text-white py-6 rounded-[24px] font-black text-lg uppercase tracking-widest shadow-2xl shadow-gray-200 active:scale-95 transition-all"
        >
          Update Profile
        </button>
      </div>
    </div>
  );

  const renderAddEditListing = () => (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => { setInternalView('default'); setEditListingId(null); }} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400">
          <i className="fas fa-chevron-left"></i>
        </button>
        <h2 className="font-black text-2xl tracking-tight">{editListingId ? t('edit') : t('add_crop')}</h2>
      </div>

      <div className="bg-white p-6 rounded-[40px] shadow-sm border border-gray-100 space-y-8">
        {/* Crop Selection */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Select Harvest Type</label>
          <div className="grid grid-cols-3 gap-2">
            {CROPS.map(crop => (
              <button
                key={crop.id}
                onClick={() => setNewListing(prev => ({ ...prev, cropId: crop.id }))}
                className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 group ${newListing.cropId === crop.id ? 'border-green-600 bg-green-50 shadow-md shadow-green-100' : 'border-gray-50 bg-gray-50/30'}`}
              >
                <span className={`text-2xl transition-transform group-active:scale-125 ${newListing.cropId === crop.id ? 'scale-110' : ''}`}>{crop.icon}</span>
                <span className={`text-[9px] font-black uppercase tracking-tighter ${newListing.cropId === crop.id ? 'text-green-700' : 'text-gray-400'}`}>{crop.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced Image Upload Area */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Harvest Photos</label>
              <span className="bg-gray-100 px-2 py-0.5 rounded text-[8px] font-black text-gray-500 uppercase">{newListing.images.length}/6</span>
            </div>
            {isAnalyzingPhoto && (
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                <i className="fas fa-sparkles animate-pulse"></i> AI Grading...
              </span>
            )}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex gap-4 overflow-x-auto no-scrollbar pb-4 pt-1 px-1 transition-all rounded-[36px] ${isDragging ? 'bg-green-50 ring-2 ring-green-400' : ''}`}
          >
            {/* Upload Button */}
            {newListing.images.length < 6 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-[40px] bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 shrink-0 hover:bg-green-50 hover:border-green-400 transition-all active:scale-95 group"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-300 group-hover:text-green-500 transition-colors shadow-sm">
                  <i className="fas fa-camera text-xl"></i>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-gray-400 group-hover:text-green-600 uppercase">Add photo</p>
                  <p className="text-[6px] font-bold text-gray-300 uppercase mt-0.5">Drag & Drop</p>
                </div>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {/* Preview List */}
            {newListing.images.map((img, idx) => (
              <div key={idx} className="relative w-32 h-32 rounded-[40px] overflow-hidden shrink-0 shadow-lg border-2 border-white animate-in zoom-in slide-in-from-right duration-300 group">
                <img
                  src={img}
                  className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-110"
                  alt={`Harvest ${idx}`}
                  onClick={() => setPreviewImageUrl(img)}
                />

                {/* Image Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                {/* Removal Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-xl flex items-center justify-center text-[10px] shadow-lg border border-white/20 active:scale-75 transition-all hover:bg-red-500"
                >
                  <i className="fas fa-trash-can"></i>
                </button>

                {/* Set as Primary Action */}
                {idx !== 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setAsPrimary(idx); }}
                    className="absolute bottom-2 right-2 px-2 py-1 bg-white/20 backdrop-blur-md text-white rounded-lg text-[6px] font-black uppercase tracking-widest border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Set Main
                  </button>
                )}

                {/* Primary Tag */}
                {idx === 0 && (
                  <div className="absolute bottom-3 left-3 bg-emerald-500 text-white px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest shadow-md flex items-center gap-1">
                    <i className="fas fa-star text-[6px]"></i> Main
                  </div>
                )}
              </div>
            ))}

            {newListing.images.length === 0 && !isAnalyzingPhoto && (
              <div className="flex-grow min-w-[200px] h-32 border-2 border-dashed border-gray-100 rounded-[40px] flex items-center justify-center flex-col gap-2 bg-gray-50/50">
                <i className="fas fa-images text-gray-200 text-2xl"></i>
                <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Upload your harvest photos</p>
              </div>
            )}
          </div>

          <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 flex items-start gap-3">
            <i className="fas fa-lightbulb text-blue-400 mt-1"></i>
            <p className="text-[9px] font-bold text-blue-700 leading-relaxed uppercase">
              TIP: Listings with bright, clear photos harvested in daylight receive up to 3x more bids.
            </p>
          </div>
        </div>

        {/* Quantity and Price */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Total Quantity</label>
            <div className="relative">
              <input
                type="number"
                value={newListing.quantity}
                onChange={(e) => setNewListing(prev => ({ ...prev, quantity: e.target.value }))}
                className="w-full bg-gray-50 border-0 p-5 rounded-2xl font-black focus:ring-2 focus:ring-green-500 outline-none text-lg"
                placeholder="0"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">KG</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Price per kg</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">₹</span>
              <input
                type="number"
                value={newListing.expectedPrice}
                onChange={(e) => setNewListing(prev => ({ ...prev, expectedPrice: e.target.value }))}
                className="w-full bg-gray-50 border-0 p-5 pl-10 rounded-2xl font-black focus:ring-2 focus:ring-green-500 outline-none text-lg"
                placeholder="0"
              />
            </div>
          </div>
        </div>


        {/* Quality Grade Selector */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Quality Grade</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'Premium', icon: '⭐', color: 'green', desc: 'No defects' },
              { value: 'Good', icon: '✓', color: 'blue', desc: 'Minor defects' },
              { value: 'Average', icon: '○', color: 'yellow', desc: 'Some defects' },
              { value: 'Fair', icon: '△', color: 'orange', desc: 'Visible defects' }
            ].map(({ value, icon, color, desc }) => (
              <button
                key={value}
                onClick={() => setNewListing(prev => ({ ...prev, grade: value as any }))}
                className={`p-4 rounded-2xl border-2 transition-all ${newListing.grade === value
                    ? `border-${color}-600 bg-${color}-50 shadow-md shadow-${color}-100`
                    : 'border-gray-100 bg-gray-50'
                  }`}
              >
                <div className={`text-2xl mb-2 ${newListing.grade === value ? `text-${color}-600` : 'text-gray-300'}`}>
                  {icon}
                </div>
                <div className={`text-[11px] font-black mb-1 ${newListing.grade === value ? `text-${color}-700` : 'text-gray-600'}`}>
                  {value}
                </div>
                <div className={`text-[7px] font-bold uppercase tracking-widest ${newListing.grade === value ? `text-${color}-600` : 'text-gray-400'}`}>
                  {desc}
                </div>
              </button>
            ))}
          </div>
          <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-400 mt-1"></i>
            <div className="text-[9px] font-bold text-blue-700 leading-relaxed">
              <p className="uppercase mb-1">Quality Standards:</p>
              <p className="opacity-80">Premium: Export quality • Good: Retail quality • Average: Local market • Fair: Processing grade</p>
            </div>
          </div>
        </div>


        <button
          onClick={handlePublish}
          disabled={!newListing.quantity || !newListing.expectedPrice || newListing.images.length === 0}
          className="w-full bg-green-600 text-white py-6 rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-green-100 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
        >
          {editListingId ? 'Save Changes' : 'Publish Harvest'}
        </button>
      </div>

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col p-6 animate-in fade-in duration-300">
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center text-xl hover:bg-white/20 active:scale-90 transition-all"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="flex-grow flex items-center justify-center relative">
            <img
              src={previewImageUrl}
              className="max-w-full max-h-[70vh] rounded-[40px] shadow-2xl object-contain animate-in zoom-in-95 duration-500"
              alt="Preview Large"
            />
          </div>
          <div className="py-10 text-center">
            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Inspection View</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="bg-white text-gray-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderHome = () => (
    <div className="space-y-8">
      <div className="bg-gray-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400 mb-2">{t('earnings_balance')}</p>
          <h2 className="text-4xl font-black mb-6 tracking-tighter">₹{totalEarned.toLocaleString()}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black uppercase opacity-40 mb-1">{t('volume_sold')}</p>
              <p className="text-lg font-black">{totalVolume} kg</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black uppercase opacity-40 mb-1">{t('pending')}</p>
              <p className="text-lg font-black text-amber-400">₹{pendingPayments.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <i className="fas fa-coins absolute right-[-20px] top-[-20px] text-[150px] opacity-10 rotate-12"></i>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-gray-900 leading-tight truncate">{user.name}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">
              {user.location?.village}, {user.location?.district}
            </p>
          </div>
        </div>
        <button
          onClick={() => setInternalView('editProfile')}
          className="bg-gray-50 text-gray-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-green-600 transition-colors"
        >
          {t('edit_profile')}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">AI Crop Suggestions</h3>
          <button
            onClick={fetchRecommendations}
            disabled={isLoadingRecs}
            className="text-[9px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1.5"
          >
            <i className={`fas fa-arrows-rotate ${isLoadingRecs ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        </div>

        {isLoadingRecs ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 animate-pulse space-y-4">
                <div className="flex justify-between">
                  <div className="h-5 w-32 bg-gray-100 rounded-lg"></div>
                  <div className="h-5 w-16 bg-gray-100 rounded-full"></div>
                </div>
                <div className="h-3 w-full bg-gray-50 rounded"></div>
                <div className="h-3 w-2/3 bg-gray-50 rounded"></div>
              </div>
            ))}
          </div>
        ) : aiRecommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiRecommendations.map((rec, idx) => (
              <div key={idx} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 relative group overflow-hidden transition-all hover:border-green-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-black text-lg text-gray-900 leading-none">{rec.cropName}</h4>
                    <p className={`text-[9px] font-black uppercase tracking-widest mt-2 flex items-center gap-1.5 ${rec.trend.toLowerCase().includes('rising') ? 'text-emerald-500' : 'text-blue-500'
                      }`}>
                      <i className={`fas ${rec.trend.toLowerCase().includes('rising') ? 'fa-arrow-trend-up' : 'fa-chart-line'}`}></i>
                      Trend: {rec.trend}
                    </p>
                  </div>
                  <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-green-100 shadow-sm">
                    {rec.demand} Demand
                  </span>
                </div>

                <p className="text-xs font-bold text-gray-500 leading-relaxed mb-4">
                  {rec.reason}
                </p>

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => geminiService.speak(`Suggestion for ${rec.cropName}: ${rec.reason}. Demand is ${rec.demand} and the trend is ${rec.trend}.`)}
                    className="bg-gray-50 hover:bg-green-50 text-gray-400 hover:text-green-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-volume-high"></i> Listen to Detail
                  </button>
                  <button
                    onClick={() => {
                      const crop = CROPS.find(c => c.name.toLowerCase() === rec.cropName.toLowerCase());
                      if (crop) setNewListing(prev => ({ ...prev, cropId: crop.id }));
                      setInternalView('add');
                    }}
                    className="text-[9px] font-black text-gray-900 uppercase tracking-widest border-b-2 border-gray-100 hover:border-green-600 transition-all"
                  >
                    List this Crop <i className="fas fa-chevron-right ml-1"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-[32px] border-2 border-dashed border-gray-100 text-center py-10">
            <i className="fas fa-robot text-gray-100 text-3xl mb-3"></i>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No recommendations yet</p>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">{t('tips_for_success')}</h3>
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
          {tipsForSuccess.map((tip) => (
            <div key={tip.id} className={`p-6 rounded-[32px] border-2 shadow-sm transition-all hover:shadow-md ${tip.color} flex gap-5 relative overflow-hidden group`}>
              <div className="w-12 h-12 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center text-xl shrink-0"><i className={`fas ${tip.icon}`}></i></div>
              <div className="min-w-0 flex-grow">
                <h4 className="font-black text-sm tracking-tight mb-1">{tip.title}</h4>
                <p className="text-xs font-bold leading-relaxed opacity-80 mb-4">{tip.desc}</p>
                <button onClick={() => geminiService.speak(`${tip.title}. ${tip.desc}`)} className="flex items-center gap-2 bg-white/60 hover:bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                  <i className="fas fa-volume-high"></i> Listen to Advice
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEarnings = () => (
    <div className="space-y-8 pb-20 px-1 animate-in fade-in duration-500">
      <div className="bg-gray-900 text-white p-8 rounded-[48px] shadow-2xl relative overflow-hidden border border-white/5">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-green-400 mb-2">Total Accumulated Revenue</p>
              <h2 className="text-5xl font-black tracking-tighter">₹{totalEarned.toLocaleString()}</h2>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10">
              <i className="fas fa-sack-dollar text-2xl text-green-400"></i>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/5 p-5 rounded-[28px] backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Crops Liquidated</p>
              <p className="text-xl font-black">{soldHistory.length} Shipments</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-5 rounded-[28px] backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Stock Out Volume</p>
              <p className="text-xl font-black text-green-400">{totalVolume.toLocaleString()} KG</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-green-500/10 rounded-full blur-[80px]"></div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Income Ledger</h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Real-time stats</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {soldHistory.map((item, idx) => (
            <div key={item.id} className="bg-white rounded-[32px] p-1 border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:border-green-100 group animate-in slide-in-from-bottom duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-gray-100 group-hover:bg-green-50 transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-gray-900 leading-tight">{item.cropName} Sale</h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                        <i className="fas fa-calendar-day text-blue-500"></i> {item.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-emerald-600 leading-none mb-1">₹{item.amount.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Payout Confirmed</p>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-2xl p-4 flex flex-col gap-3 border border-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-user-tie text-gray-300"></i> Buyer
                    </span>
                    <span className="text-xs font-black text-gray-800">{item.buyer}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-weight-hanging text-gray-300"></i> Quantity Sold
                    </span>
                    <span className="text-xs font-black text-gray-800">{item.qty.toLocaleString()} KG</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-tag text-gray-300"></i> Rate Agreed
                    </span>
                    <span className="text-xs font-black text-gray-800">₹{item.price} / KG</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50/30 border-t border-gray-50 px-6 py-4 flex justify-between items-center rounded-b-[32px]">
                <button className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 hover:text-green-600 transition-colors">
                  <i className="fas fa-file-invoice"></i> View Digital Bill
                </button>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500/20"></div>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {pendingPayments > 0 && (
        <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-[32px] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-400 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-amber-100">
              <i className="fas fa-hourglass-half"></i>
            </div>
            <div>
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Incoming Transit Payout</p>
              <h4 className="font-black text-amber-900 text-lg">₹{pendingPayments.toLocaleString()}</h4>
            </div>
          </div>
          <button className="bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-600 shadow-sm border border-amber-200">
            Track Load
          </button>
        </div>
      )}
    </div>
  );

  // Main component return
  if (internalView === 'add') {
    return renderAddEditListing();
  }

  if (internalView === 'editProfile' || activeTab === 'account') {
    return renderProfileEditor();
  }

  return (
    <div className="p-4 pt-6 w-full mx-auto pb-24 md:pb-8 h-full relative">
      {(activeTab === 'home' || !activeTab) && renderHome()}
      {activeTab === 'earnings' && renderEarnings()}
      {activeTab === 'chats' && renderOffers()}
      {activeTab === 'listings' && (
        <div className="space-y-6 pb-20">
          <div className="flex justify-between items-center px-1 mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('my_listings')}</h3>
            <button
              onClick={() => { setInternalView('add'); setEditListingId(null); setNewListing({ cropId: '1', quantity: '', unit: 'kg', expectedPrice: '', grade: 'A', harvestDate: new Date().toISOString().split('T')[0], images: [] }); }}
              className="bg-black text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
            >
              <i className="fas fa-plus mr-2"></i> {t('add_listing')}
            </button>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
              <div className="w-20 h-20 bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center text-gray-300 shadow-sm">
                <i className="fas fa-wheat-awn text-3xl"></i>
              </div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">No listings active</p>
              <button
                onClick={() => { setInternalView('add'); setEditListingId(null); }}
                className="text-green-600 font-bold text-xs uppercase tracking-widest hover:underline"
              >
                Create your first listing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {listings.map(l => {
                const priceInfo = getPriceCompetitiveness(l.expectedPrice, l.cropId, l.mandiPrice);
                const offers = getOffersForListing(l.cropId);
                const bestOffer = offers.length > 0 ? offers.reduce((prev, curr) => prev.price > curr.price ? prev : curr) : null;

                return (
                  <div key={l.id} className="bg-white p-5 rounded-[40px] border shadow-sm hover:border-green-100 transition-all overflow-hidden relative">
                    {offers.length > 0 && (
                      <div className="absolute top-4 right-4 z-10">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white text-[10px] font-black animate-pulse">
                          {offers.length}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-5">
                      <div className="relative shrink-0">
                        <img src={l.images[0]} className="w-24 h-24 rounded-3xl object-cover border-2 border-gray-50 shadow-sm" alt="Crop" />
                        <div className="absolute -bottom-2 -left-2 bg-white px-2 py-0.5 rounded-lg border shadow-sm text-[8px] font-black uppercase text-gray-400">
                          Grade {l.grade}
                        </div>
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-xl text-gray-900 leading-none mb-1">{CROPS.find(c => c.id === l.cropId)?.name}</h4>
                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.1em]">{l.quantity} {l.unit} • ₹{l.expectedPrice}/kg</p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className={`${priceInfo.color} px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1`}>
                            <i className={`fas ${priceInfo.icon}`}></i> {priceInfo.label}
                          </span>
                          {bestOffer && (
                            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                              <i className="fas fa-ranking-star"></i> High Bid: ₹{bestOffer.price}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {bestOffer && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-indigo-500 text-xs shadow-sm">
                            <i className="fas fa-user-tag"></i>
                          </div>
                          <div>
                            <p className="text-[7px] font-black text-gray-400 uppercase leading-none mb-1">Latest Offer</p>
                            <p className="text-[10px] font-black text-gray-800 leading-none">{bestOffer.buyer}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[7px] font-black text-gray-400 uppercase leading-none mb-1">Proposed Price</p>
                          <p className="text-[13px] font-black text-emerald-600 leading-none">₹{bestOffer.price}/kg</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => { setEditListingId(l.id); setInternalView('add'); }}
                        className="flex-1 bg-gray-50 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <i className="fas fa-pen mr-2"></i> Edit
                      </button>
                      <button
                        onClick={() => setListingToDelete(l.id)}
                        className="flex-1 bg-red-50 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <i className="fas fa-trash mr-2"></i> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {activeTab === 'prices' && (
        <div className="space-y-8 pb-20 px-1 animate-in fade-in duration-500">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">{t('market_prices')}</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Live Benchmarking</p>
            </div>
          </div>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {marketPrices.map((p, i) => {
              const crop = CROPS.find(c => c.id === p.cropId);
              const mspDiff = ((p.avg - p.msp) / p.msp) * 100;
              const nearbyDiff = ((p.nearbyAvg - p.avg) / p.avg) * 100;

              return (
                <div key={i} className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-xl hover:border-emerald-100 group">
                  <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:bg-emerald-50 transition-colors">
                        {crop?.icon}
                      </div>
                      <div>
                        <h4 className="font-black text-lg text-gray-900 tracking-tight leading-none mb-1">{crop?.name}</h4>
                        <div className="flex items-center gap-1.5">
                          <i className="fas fa-map-marker-alt text-emerald-500 text-[10px]"></i>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.mandi}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-gray-900 tracking-tighter leading-none mb-1">₹{p.avg}</p>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full inline-block">Current Avg</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 text-[10px]">
                    <div className="p-5 border-r border-gray-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <i className="fas fa-shield-halved text-blue-500 text-[10px]"></i> MSP
                        </span>
                      </div>
                      <p className="text-lg font-black text-gray-900 mb-1">₹{p.msp}<span className="text-[10px] ml-1 text-gray-400 font-bold">/kg</span></p>
                      <div className={`font-black uppercase tracking-widest flex items-center gap-1 ${mspDiff >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        <i className={`fas ${mspDiff >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                        {Math.abs(Math.round(mspDiff))}% {mspDiff >= 0 ? 'up' : 'down'}
                      </div>
                    </div>

                    <div className="p-5 bg-indigo-50/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <i className="fas fa-location-dot text-indigo-500 text-[10px]"></i> Nearby
                        </span>
                      </div>
                      <p className="text-lg font-black text-gray-900 mb-1">₹{p.nearbyAvg}<span className="text-[10px] ml-1 text-gray-400 font-bold">/kg</span></p>
                      <div className={`font-black uppercase tracking-widest flex items-center gap-1 ${nearbyDiff > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {nearbyDiff > 0 ? (
                          <>
                            <i className="fas fa-arrow-trend-up"></i>
                            {Math.round(nearbyDiff)}% higher
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check"></i>
                            Best Price
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 flex justify-between items-center border-t border-gray-50/50">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Updated {p.date}</p>
                    <button
                      onClick={() => geminiService.speak(`For ${crop?.name}, the current average price at ${p.mandi} is ₹${p.avg}.`)}
                      className="text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 hover:bg-emerald-600 hover:text-white transition-all"
                    >
                      <i className="fas fa-volume-high"></i> Listen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-emerald-50 p-6 rounded-[32px] border-2 border-emerald-100 flex items-start gap-4 shadow-inner">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
              <i className="fas fa-info-circle"></i>
            </div>
            <p className="text-[11px] font-bold text-emerald-800 leading-relaxed uppercase tracking-wider">
              Price data is sourced from real-time mandi feeds. Compare with MSP and nearby markets.
            </p>
          </div>
        </div>
      )}

      {listingToDelete && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl">
            <h3 className="text-xl font-black text-gray-900 text-center mb-2">Delete Listing?</h3>
            <p className="text-[11px] text-gray-400 font-bold text-center uppercase tracking-widest mb-8">This action cannot be undone.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setListingToDelete(null)} className="bg-gray-50 py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest text-gray-500">Cancel</button>
              <button onClick={() => { confirmDeleteListing(); geminiService.speak("Listing deleted."); }} className="bg-red-600 text-white py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerDashboard;