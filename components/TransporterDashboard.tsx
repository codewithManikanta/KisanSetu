
import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { Language, User, Gender, Crop } from '../types';
import { TRANSLATIONS, CROPS } from '../constants.tsx';

interface Vehicle {
  type: string;
  capacity: number;
  costPerKm: number;
  licensePlate: string;
  isRegistered: boolean;
}

interface TransporterDashboardProps {
  activeTab: string;
  language: Language;
  user: User;
  onUpdateProfile: (updates: Partial<User>) => void;
  deliveries: any[];
  onUpdateStatus: (id: string, status: string, transporterId?: string) => void;
  averageRating: number;
  totalReviews: number;
  earnings: { total: number; pending: number };
}

const VEHICLE_TYPES = [
  { id: 'mini', label: 'Mini Truck (Tata Ace)', cap: 750, icon: 'fa-truck-front' },
  { id: 'pickup', label: 'Pickup (Mahindra Bolero)', cap: 1500, icon: 'fa-truck-pickup' },
  { id: 'lcv', label: 'LCV (709/909)', cap: 3500, icon: 'fa-truck' },
  { id: 'hcv', label: 'Heavy Truck (12-Wheeler)', cap: 15000, icon: 'fa-truck-moving' },
];

const TransporterDashboard: React.FC<TransporterDashboardProps> = ({
  activeTab,
  language,
  user,
  onUpdateProfile,
  deliveries,
  onUpdateStatus,
  averageRating,
  totalReviews,
  earnings
}) => {
  const t = (key: string) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  };

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  /* New state for detailed profile */
  const [tempProfile, setTempProfile] = useState({
    name: user.name,
    gender: user.gender || Gender.MALE,
    phone: user.phone || '',
    email: user.email || '',
    village: user.location?.village || '',
    district: user.location?.district || '',
    state: user.location?.state || '',
    experience: '5',
    routes: 'Local, Inter-district',
    languages: 'English, Hindi'
  });

  // Vehicle management state
  const [vehicle, setVehicle] = useState<Vehicle>({
    type: 'mini',
    capacity: 750,
    costPerKm: 8,
    licensePlate: '',
    isRegistered: false
  });
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(vehicle);

  const handleSaveVehicle = () => {
    setVehicle(vehicleForm);
    setIsEditingVehicle(false);
    geminiService.speak("Vehicle details updated successfully.");
  };


  useEffect(() => {
    setTempProfile({
      name: user.name,
      gender: user.gender || Gender.MALE,
      phone: user.phone || '',
      email: user.email || '',
      village: user.location?.village || '',
      district: user.location?.district || '',
      state: user.location?.state || '',
      experience: '5',
      routes: 'Local, Inter-district',
      languages: 'English, Hindi'
    });
  }, [user]);

  // Derived State
  const myJobs = deliveries.filter(d => d.transporterId === user.id && d.status !== 'DELIVERED');
  const availableJobs = deliveries.filter(d => d.status === 'OPEN_FOR_TRANSIT');
  const history = deliveries.filter(d => d.transporterId === user.id && d.status === 'DELIVERED');

  const handleAcceptJob = (job: any) => {
    onUpdateStatus(job.id, 'ACCEPTED', user.id);
    geminiService.speak("Job accepted. Navigation details sent to your device.");
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'ACCEPTED': return { label: 'Confirm Pickup', next: 'PICKED_UP', icon: 'fa-box-open' };
      case 'PICKED_UP': return { label: 'Start Transit', next: 'IN_TRANSIT', icon: 'fa-truck-fast' };
      case 'IN_TRANSIT': return { label: 'Mark Delivered', next: 'DELIVERED', icon: 'fa-check-circle' };
      default: return null;
    }
  };

  const handleNextStatus = (id: string, currentStatus: string) => {
    const next = getNextStatus(currentStatus);
    if (next) {
      onUpdateStatus(id, next.next);
      geminiService.speak(`Status updated to ${next.next.replace('_', ' ')}.`);
    }
  };

  const [homeView, setHomeView] = useState<'active' | 'market'>('active');

  const renderHome = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* View Toggle */}
      <div className="bg-gray-100 p-1.5 rounded-2xl flex relative">
        <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-spring ${homeView === 'market' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'}`}></div>
        <button
          onClick={() => setHomeView('active')}
          className={`flex-1 relative z-10 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${homeView === 'active' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Active Shipments {myJobs.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">{myJobs.length}</span>}
        </button>
        <button
          onClick={() => setHomeView('market')}
          className={`flex-1 relative z-10 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${homeView === 'market' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Find Loads {availableJobs.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-full">{availableJobs.length}</span>}
        </button>
      </div>

      {homeView === 'market' && (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center px-2">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Marketplace</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available assignments for your fleet</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100">
                <i className="fas fa-filter text-xs"></i>
              </button>
              <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100">
                <i className="fas fa-sort text-xs"></i>
              </button>
            </div>
          </div>

          {availableJobs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <i className="fas fa-inbox text-4xl mb-4 opacity-20"></i>
              <p className="text-xs font-black uppercase tracking-widest">No loads available right now</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {availableJobs.map((job, idx) => (
                <div key={job.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group animate-in slide-in-from-bottom duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner border border-emerald-100">
                        {job.crop === 'Tomato' ? '🍅' : job.crop === 'Wheat' ? '🌾' : '📦'}
                      </div>
                      <div>
                        <h4 className="font-black text-lg text-gray-900 leading-none mb-1.5">{job.crop} Transport</h4>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <i className="fas fa-weight-hanging text-emerald-500"></i> {Math.floor(Math.random() * 2000) + 500} kg
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-gray-900 tracking-tighter">₹{job.cost}</p>
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Fixed Rate</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-3">
                    <div className="flex items-start gap-3 relative">
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div className="w-0.5 h-6 bg-gray-200 my-0.5"></div>
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Pickup From</p>
                          <p className="text-xs font-bold text-gray-900">{job.pickupAddress?.split(',')[0] || 'Farm Location'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Deliver To</p>
                          <p className="text-xs font-bold text-gray-900">{job.destination}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      handleAcceptJob(job);
                      setHomeView('active');
                    }}
                    className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-600 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2 group-hover:shadow-emerald-200"
                  >
                    Accept Assignment <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {homeView === 'active' && (
        <div className="space-y-6 animate-in slide-in-from-left duration-300">
          <div className="flex justify-between items-center px-2">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Active Shipments</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live tracking updates</p>
            </div>
            {myJobs.length > 0 && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">
              {myJobs.length} Active
            </span>}
          </div>

          {myJobs.length === 0 ? (
            <div className="bg-white p-12 rounded-[40px] border-2 border-dashed border-gray-100 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 text-2xl mx-auto mb-4">
                <i className="fas fa-truck-ramp-box"></i>
              </div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Your queue is empty.</p>
              <button
                onClick={() => setHomeView('market')}
                className="mt-4 px-6 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg"
              >
                Find Loads in Marketplace
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {myJobs.map(job => {
                const nextAction = getNextStatus(job.status);
                // Calculate progress for UI
                const steps = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
                const currentStepIdx = steps.indexOf(job.status);
                const progress = ((currentStepIdx) / (steps.length - 1)) * 100;

                return (
                  <div key={job.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-blue-500/5 relative overflow-hidden ring-4 ring-transparent hover:ring-blue-50 transition-all">
                    {/* Map Background Placeholder */}
                    <div className="absolute top-0 right-0 w-2/3 h-full opacity-5 pointer-events-none bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center"></div>

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-blue-600 text-white rounded-[24px] flex items-center justify-center text-3xl shadow-lg shadow-blue-200">
                            {job.crop === 'Tomato' ? '🍅' : job.crop === 'Wheat' ? '🌾' : '🚚'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${job.status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                {job.status.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">#{job.id}</span>
                            </div>
                            <h3 className="text-xl font-black text-gray-900">{job.crop} Delivery</h3>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-gray-900">₹{job.cost}</div>
                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Payout</div>
                        </div>
                      </div>

                      {/* Timeline Visualization */}
                      <div className="bg-gray-50 rounded-[28px] p-6 mb-8 border border-gray-100">
                        <div className="relative h-2 bg-gray-200 rounded-full mb-6 mx-2">
                          <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                          {/* Steps */}
                          <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm flex items-center justify-center" style={{ left: '0%' }}>
                            {currentStepIdx >= 0 && <i className="fas fa-check text-[6px] text-white"></i>}
                          </div>
                          <div className="absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-colors delay-100" style={{ left: '33%', backgroundColor: currentStepIdx >= 1 ? '#3b82f6' : '#e5e7eb' }}>
                            {currentStepIdx >= 1 && <i className="fas fa-check text-[6px] text-white"></i>}
                          </div>
                          <div className="absolute top-1/2 left-2/3 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-colors delay-200" style={{ left: '66%', backgroundColor: currentStepIdx >= 2 ? '#3b82f6' : '#e5e7eb' }}>
                            {currentStepIdx >= 2 && <i className="fas fa-check text-[6px] text-white"></i>}
                          </div>
                          <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-colors delay-300" style={{ left: '100%', backgroundColor: currentStepIdx >= 3 ? '#3b82f6' : '#e5e7eb' }}>
                            {currentStepIdx >= 3 && <i className="fas fa-check text-[6px] text-white"></i>}
                          </div>
                        </div>
                        <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          <span>Accepted</span>
                          <span>Picked Up</span>
                          <span>In Transit</span>
                          <span>Delivered</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-4">
                        <button className="py-4 bg-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                          <i className="fas fa-phone"></i> Contact Farmer
                        </button>

                        {nextAction ? (
                          <button
                            onClick={() => handleNextStatus(job.id, job.status)}
                            className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            {nextAction.label} <i className={`fas ${nextAction.icon}`}></i>
                          </button>
                        ) : (
                          <button disabled className="py-4 bg-green-100 text-green-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-default">
                            <i className="fas fa-check-circle"></i> Completed
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderEarnings = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Main Earnings Card */}
        <div className="bg-black text-white p-10 rounded-[48px] shadow-2xl relative overflow-hidden group col-span-1 md:col-span-2">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-2">Total Revenue</p>
                <h2 className="text-6xl font-black tracking-tighter mb-1">₹{(earnings.total / 1000).toFixed(1)}k</h2>
                <p className="text-sm font-bold text-gray-400">Total lifetime earnings</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-emerald-400 border border-white/5">
                <i className="fas fa-chart-line text-2xl"></i>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 p-5 rounded-[24px] backdrop-blur-md border border-white/5 hover:bg-white/15 transition-colors">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-2">This Month</p>
                <p className="text-2xl font-black">₹{(earnings.total / 1000 * 0.4).toFixed(1)}k</p>
                <div className="mt-2 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <i className="fas fa-arrow-up"></i> 12%
                </div>
              </div>
              <div className="bg-white/10 p-5 rounded-[24px] backdrop-blur-md border border-white/5 hover:bg-white/15 transition-colors">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-2">Pending</p>
                <p className="text-2xl font-black">₹{(earnings.pending / 1000).toFixed(1)}k</p>
                <div className="mt-2 text-[10px] text-gray-400 font-bold">Processing</div>
              </div>
              <div className="bg-white/10 p-5 rounded-[24px] backdrop-blur-md border border-white/5 hover:bg-white/15 transition-colors">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-2">Trips</p>
                <p className="text-2xl font-black">{history.length}</p>
                <div className="mt-2 text-[10px] text-blue-400 font-bold">Completed</div>
              </div>
            </div>
          </div>

          {/* Decorative Gradients */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none group-hover:bg-emerald-500/30 transition-all duration-1000"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        </div>
      </div>

      <div className="flex justify-between items-center px-2 mt-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Transaction History</h3>
        <button className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors">Download Report</button>
      </div>

      {history.length === 0 ? (
        <div className="p-12 bg-gray-50 rounded-[32px] border border-gray-100 text-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-3">
            <i className="fas fa-file-invoice"></i>
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No transaction history found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((job, idx) => (
            <div key={job.id} className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-50 rounded-[20px] flex items-center justify-center text-emerald-600 text-xl group-hover:bg-emerald-100 transition-colors shadow-sm">
                  <i className="fas fa-arrow-down-long rotate-45"></i>
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-base mb-1">{job.crop} Transport Payment</h4>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    <span>#{job.id.substring(0, 8)}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 pl-16 md:pl-0">
                <div className="text-right">
                  <span className="px-3 py-1 rounded-lg bg-green-50 text-green-700 text-[9px] font-black uppercase tracking-widest border border-green-100">Paid</span>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl text-gray-900 tracking-tight">+₹{job.cost}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Credited to Bank</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const handleSaveProfile = () => {
    onUpdateProfile({
      name: tempProfile.name,
      gender: tempProfile.gender,
      email: tempProfile.email,
      location: { village: tempProfile.village, district: tempProfile.district, state: tempProfile.state }
      // In a real app, we'd save the other fields too
    });
    setIsEditingProfile(false);
    geminiService.speak("Profile updated successfully!");
  };

  const renderProfile = () => (
    <div className="space-y-6 pb-24 animate-in slide-in-from-bottom duration-500">
      <div className="bg-white p-8 rounded-[48px] shadow-sm border border-gray-100 relative overflow-hidden group">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 rounded-full blur-[80px] group-hover:bg-indigo-500/15 transition-all duration-1000 scale-110 motion-safe:animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 rounded-[36px] blur opacity-20"></div>
                <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-50 to-white rounded-[36px] flex items-center justify-center text-4xl shadow-lg border border-white">
                  <span className="scale-110 drop-shadow-sm">🚚</span>
                </div>
                {/* Online Status Dot */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-[3px] border-white rounded-full"></div>
              </div>

              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2">{user.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
                    <i className="fas fa-certificate text-[10px] text-indigo-600"></i>
                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Verified Pro</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 border border-yellow-100 rounded-full">
                    <i className="fas fa-star text-[10px] text-yellow-500"></i>
                    <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">{averageRating || 4.8} Rating</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => isEditingProfile ? handleSaveProfile() : setIsEditingProfile(true)}
              className={`group flex items-center gap-2 px-5 py-3.5 rounded-2xl transition-all shadow-sm ${isEditingProfile
                ? 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <i className={`fas ${isEditingProfile ? 'fa-check' : 'fa-pen-to-square'} transition-transform group-hover:scale-110`}></i>
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline-block">
                {isEditingProfile ? 'Save Changes' : 'Edit Profile'}
              </span>
            </button>
          </div>

          <div className="grid gap-6">
            {/* Personal Details Section */}
            <div className={`bg-gray-50/60 backdrop-blur-sm p-7 rounded-[36px] border border-gray-100 transition-all duration-300 ${isEditingProfile ? 'ring-2 ring-indigo-100 bg-white shadow-xl' : ''}`}>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs"><i className="fas fa-user"></i></span>
                Personal Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Name Field */}
                <div className="space-y-1.5 group/field">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover/field:text-indigo-500 transition-colors">Full Name</label>
                  {isEditingProfile ? (
                    <input type="text" value={tempProfile.name} onChange={e => setTempProfile({ ...tempProfile, name: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 text-sm border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none" />
                  ) : (
                    <p className="text-base font-black text-gray-900">{user.name}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div className="space-y-1.5 group/field">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover/field:text-indigo-500 transition-colors">Primary Phone</label>
                  <p className="text-base font-black text-gray-900 flex items-center gap-2">
                    {user.phone || '+91 98765 43210'}
                    {isEditingProfile && <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">Locked</span>}
                  </p>
                </div>

                {/* Email Field */}
                <div className="space-y-1.5 group/field">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover/field:text-indigo-500 transition-colors">Email Address</label>
                  {isEditingProfile ? (
                    <input type="email" value={tempProfile.email} onChange={e => setTempProfile({ ...tempProfile, email: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 text-sm border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none" placeholder="name@example.com" />
                  ) : (
                    <p className="text-base font-black text-gray-900 break-all">{user.email || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location & Operations Section */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className={`bg-gray-50/60 backdrop-blur-sm p-7 rounded-[36px] border border-gray-100 flex flex-col transition-all duration-300 hover:bg-white hover:shadow-lg hover:border-indigo-50`}>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs"><i className="fas fa-map-pin"></i></span>
                  Base Location
                </h4>

                <div className="space-y-5 flex-1">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Village / City</label>
                    {isEditingProfile ? (
                      <input type="text" value={tempProfile.village} onChange={e => setTempProfile({ ...tempProfile, village: e.target.value })} className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                    ) : (
                      <p className="text-sm font-black text-gray-900">{user.location?.village || '—'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">District</label>
                      {isEditingProfile ? (
                        <input type="text" value={tempProfile.district} onChange={e => setTempProfile({ ...tempProfile, district: e.target.value })} className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
                      ) : (
                        <p className="text-sm font-black text-gray-900">{user.location?.district || '—'}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">State</label>
                      {isEditingProfile ? (
                        <input type="text" value={tempProfile.state} onChange={e => setTempProfile({ ...tempProfile, state: e.target.value })} className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
                      ) : (
                        <p className="text-sm font-black text-gray-900">{user.location?.state || '—'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`bg-gray-50/60 backdrop-blur-sm p-7 rounded-[36px] border border-gray-100 flex flex-col transition-all duration-300 hover:bg-white hover:shadow-lg hover:border-blue-50`}>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs"><i className="fas fa-briefcase"></i></span>
                  Work Profile
                </h4>

                <div className="space-y-5 flex-1">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Experience</label>
                    {isEditingProfile ? (
                      <div className="relative">
                        <input type="text" value={tempProfile.experience} onChange={e => setTempProfile({ ...tempProfile, experience: e.target.value })} className="w-full p-3 pl-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">Years</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(parseInt(tempProfile.experience) * 10, 100)}%` }}></div>
                        </div>
                        <span className="text-sm font-black text-gray-900 whitespace-nowrap">{tempProfile.experience} Years</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Preferred Routes</label>
                    {isEditingProfile ? (
                      <input type="text" value={tempProfile.routes} onChange={e => setTempProfile({ ...tempProfile, routes: e.target.value })} className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {tempProfile.routes.split(',').map((route, i) => (
                          <span key={i} className="bg-white border border-gray-200 px-2 py-1 rounded-lg text-[10px] font-bold text-gray-600 uppercase tracking-wide shadow-sm">{route.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  const renderVehicleManagement = () => (
    <div className="space-y-6 pb-24 animate-in slide-in-from-bottom duration-500 delay-100">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Fleet Management</h3>
      </div>

      <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-8 rounded-[48px] text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[80px] group-hover:bg-white/20 transition-all duration-700 pointer-events-none skew-x-12"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/30 rounded-full blur-[60px] pointer-events-none"></div>

        <div className="relative z-10 transition-all duration-500">
          <div className="flex justify-between items-start mb-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full mb-3 border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Active Vehicle</span>
              </div>
              <h2 className="text-4xl font-black tracking-tight mb-1">{vehicle.type}</h2>
              <p className="text-base font-medium text-indigo-200 flex items-center gap-2">
                <span className="bg-white/10 px-2 py-0.5 rounded text-sm font-mono tracking-wider">{vehicle.licensePlate || 'NO PLATE'}</span>
              </p>
            </div>

            <div className="w-20 h-20 bg-white/10 rounded-[32px] flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20 group-hover:scale-110 transition-transform duration-500">
              <i className="fas fa-truck-front text-3xl text-white"></i>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 backdrop-blur-md p-5 rounded-[24px] border border-white/10 hover:bg-black/30 transition-colors">
              <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Max Capacity</p>
              <p className="text-2xl font-black">{vehicle.capacity} <span className="text-sm font-bold opacity-60">kg</span></p>
            </div>
            <div className="bg-black/20 backdrop-blur-md p-5 rounded-[24px] border border-white/10 hover:bg-black/30 transition-colors">
              <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Base Rate</p>
              <p className="text-2xl font-black">₹{vehicle.costPerKm}<span className="text-sm font-bold opacity-60">/km</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div>
            <h3 className="text-xl font-black text-gray-900">Vehicle Configuration</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage fleet details</p>
          </div>

          <button
            onClick={() => isEditingVehicle ? handleSaveVehicle() : setIsEditingVehicle(true)}
            className={`text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-sm flex items-center gap-2 ${isEditingVehicle
              ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
          >
            <i className={`fas ${isEditingVehicle ? 'fa-check' : 'fa-sliders'}`}></i>
            {isEditingVehicle ? 'Save Config' : 'Configure'}
          </button>
        </div>

        <div className="space-y-6 relative z-10">
          {isEditingVehicle ? (
            <div className="animate-in fade-in duration-300 space-y-8">
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4 block ml-1">Select Vehicle Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {VEHICLE_TYPES.map(vt => (
                    <button
                      key={vt.id}
                      onClick={() => setVehicleForm({ ...vehicleForm, type: vt.label, capacity: vt.cap })}
                      className={`p-5 rounded-[24px] text-left border-2 transition-all flex flex-col gap-3 group ${vehicleForm.type === vt.label
                        ? 'border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100'
                        : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-gray-50'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${vehicleForm.type === vt.label ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:text-indigo-500'
                        }`}>
                        <i className={`fas ${vt.icon}`}></i>
                      </div>
                      <div>
                        <p className={`text-xs font-black uppercase tracking-wide leading-tight mb-1 ${vehicleForm.type === vt.label ? 'text-indigo-900' : 'text-gray-900'}`}>{vt.label}</p>
                        <p className={`text-[10px] font-bold ${vehicleForm.type === vt.label ? 'text-indigo-500' : 'text-gray-400'}`}>{vt.cap} kg Capacity</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2 group">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 group-hover:text-indigo-500 transition-colors">License Plate</label>
                  <input type="text" value={vehicleForm.licensePlate} onChange={e => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-gray-900 text-sm border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none" placeholder="KA-01-AB-1234" />
                </div>
                <div className="space-y-2 group">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 group-hover:text-indigo-500 transition-colors">Rate per KM (₹)</label>
                  <input type="number" value={vehicleForm.costPerKm} onChange={e => setVehicleForm({ ...vehicleForm, costPerKm: Number(e.target.value) })} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-gray-900 text-sm border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-r from-emerald-50 to-white rounded-[24px] flex items-center justify-between border border-emerald-100 group cursor-pointer hover:shadow-lg hover:shadow-emerald-50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-sm">
                    <i className="fas fa-check-shield"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-wide">Verification Status</p>
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <i className="fas fa-check-circle"></i> Service Ready
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-300 border border-emerald-100 group-hover:scale-110 transition-transform">
                  <i className="fas fa-chevron-right text-xs"></i>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-r from-gray-50 to-white rounded-[24px] flex items-center justify-between border border-gray-100 group cursor-pointer hover:bg-gray-50 transition-all opacity-80 hover:opacity-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white text-gray-400 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-gray-100">
                    <i className="fas fa-file-invoice"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-wide">Registration Validity</p>
                    <p className="text-[10px] text-gray-400 font-bold">Valid until Oct 2026</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 pt-6 w-full mx-auto min-h-screen relative pb-24 md:pb-8">
      {/* Sticky Header for Mobile */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-gray-100 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {activeTab === 'home' || !activeTab ? 'Find Loads' :
              activeTab === 'earnings' ? 'My Earnings' :
                'My Profile'}
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {activeTab === 'home' || !activeTab ? 'Marketplace & Orders' :
              activeTab === 'earnings' ? 'Track your revenue' :
                'Manage account & fleet'}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200 shadow-sm">
          <i className={`fas ${activeTab === 'home' || !activeTab ? 'fa-truck-fast' :
            activeTab === 'earnings' ? 'fa-wallet' :
              'fa-user-gear'
            }`}></i>
        </div>
      </div>

      {(activeTab === 'home' || !activeTab) && renderHome()}
      {activeTab === 'earnings' && renderEarnings()}
      {(activeTab === 'profile' || activeTab === 'account' || activeTab === 'vehicle') && (
        <div className="space-y-8 animate-in fade-in slide-in-from-left duration-500">
          {renderProfile()}
          {renderVehicleManagement()}
        </div>
      )}
    </div>
  );

};

export default TransporterDashboard;
