import React from 'react';
import { UserRole, Language } from '../types';
import { TRANSLATIONS } from '../constants.tsx';

interface LayoutProps {
  children: React.ReactNode;
  userRole?: UserRole;
  userName?: string;
  userLocation?: string;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
}

const Layout: React.FC<LayoutProps> = ({ children, userRole, userName, userLocation, onLogout, activeTab, setActiveTab, language }) => {
  const t = (key: string) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  };

  const getNavItems = () => {
    switch (userRole) {
      case UserRole.FARMER:
        return [
          { id: 'home', icon: 'fa-house', label: t('home') },
          { id: 'listings', icon: 'fa-wheat-awn', label: t('my_listings') },
          { id: 'prices', icon: 'fa-chart-line', label: t('market_prices') },
          { id: 'chats', icon: 'fa-comments', label: t('offers') },
          { id: 'earnings', icon: 'fa-wallet', label: t('earnings') },
          { id: 'account', icon: 'fa-user', label: t('profile') },
        ];
      case UserRole.BUYER:
        return [
          { id: 'home', icon: 'fa-search', label: t('home') },
          { id: 'orders', icon: 'fa-receipt', label: t('my_orders') },
          { id: 'chats', icon: 'fa-comments', label: t('negotiations') },
          { id: 'profile', icon: 'fa-user', label: t('profile') },
        ];
      case UserRole.TRANSPORTER:
        return [
          { id: 'home', icon: 'fa-truck', label: t('active_deliveries') },
          { id: 'earnings', icon: 'fa-wallet', label: t('earnings') },
          { id: 'vehicle', icon: 'fa-car', label: t('profile') },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex flex-col w-72 fixed h-full bg-white border-r border-gray-100 z-50 transition-all duration-300">
        <div className="p-8 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-100">
              <i className="fas fa-leaf text-2xl"></i>
            </div>
            <div>
              <h1 className="font-black text-2xl tracking-tighter text-gray-900">KisanSetu</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">{userRole ? t(userRole.toLowerCase()) : ''}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {getNavItems().map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${activeTab === item.id
                  ? 'bg-green-50 text-green-700 shadow-sm'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeTab === item.id ? 'bg-white shadow-sm' : 'bg-transparent'
                }`}>
                <i className={`fas ${item.icon} text-lg ${activeTab === item.id ? 'scale-110' : ''}`}></i>
              </div>
              <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
              {activeTab === item.id && (
                <i className="fas fa-chevron-right ml-auto text-[10px] opacity-50"></i>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-50 mt-auto">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 text-red-400 hover:text-red-500 hover:bg-red-50 py-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest"
          >
            <i className="fas fa-power-off"></i> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:ml-72 min-w-0 transition-all duration-300">

        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white shadow-md">
              <i className="fas fa-leaf text-xl"></i>
            </div>
            <div>
              <h1 className="font-black text-lg leading-tight tracking-tight">KisanSetu</h1>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em]">{userRole ? t(userRole.toLowerCase()) : ''}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
          >
            <i className="fas fa-power-off"></i>
          </button>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden md:flex bg-white/80 backdrop-blur-xl border-b border-gray-100 px-8 py-4 justify-between items-center sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-gray-800 tracking-tight">
              {getNavItems().find(i => i.id === activeTab)?.label || 'Dashboard'}
            </h2>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
              <i className="fas fa-globe text-gray-400 text-[10px]"></i>
              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{language === Language.ENGLISH ? 'EN' : 'HI'}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-black text-gray-900 leading-none mb-0.5">{userName}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{userLocation || 'Bharat'}</p>
            </div>
            <div className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center font-black shadow-lg shadow-gray-200">
              {userName?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-grow p-4 md:p-8 overflow-x-hidden pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-20 px-2 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        {getNavItems().map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full transition-all relative ${activeTab === item.id ? 'text-green-600' : 'text-gray-400'
              }`}
          >
            {activeTab === item.id && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-green-600 rounded-b-full"></div>
            )}
            <i className={`fas ${item.icon} text-lg mb-1.5 ${activeTab === item.id ? 'scale-110' : ''}`}></i>
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
