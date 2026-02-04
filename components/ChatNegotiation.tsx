
import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { geminiService } from '../services/geminiService';

interface ChatNegotiationProps {
  listing: any;
  marketPrice: number;
  initialOffer: number;
  userRole: UserRole;
  onClose: () => void;
  onAcceptDeal?: (deal: any) => void;
}

interface Message {
  id: string;
  sender: 'farmer' | 'buyer' | 'system';
  text: string;
  timestamp: string;
  isOffer?: boolean;
  offerValue?: number;
  image?: string;
}

const ChatNegotiation: React.FC<ChatNegotiationProps> = ({ 
  listing, 
  marketPrice, 
  initialOffer, 
  userRole, 
  onClose, 
  onAcceptDeal 
}) => {
  const isFarmer = userRole === UserRole.FARMER;
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      sender: 'system', 
      text: `Negotiation secure for ${listing.cropName}.`, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    },
    { 
      id: '2', 
      sender: isFarmer ? 'buyer' : 'farmer', 
      text: isFarmer 
        ? `I am ready to buy your ${listing.cropName} immediately.`
        : `My ${listing.cropName} is of premium quality. I'm looking for a fair price.`, 
      isOffer: true,
      offerValue: initialOffer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);
  
  const [currentOffer, setCurrentOffer] = useState(initialOffer);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  
  // Delivery Responsibility State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryResponsibility, setDeliveryResponsibility] = useState<'FARMER' | 'BUYER'>('FARMER');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
        geminiService.speak("Photo attached.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAcceptClick = () => {
    setShowDeliveryModal(true);
  };

  const confirmAccept = () => {
    setShowDeliveryModal(false);
    handleAction('ACCEPT');
  };

  const handleAction = async (type: 'COUNTER' | 'ACCEPT' | 'REJECT' | 'SEND_TEXT', value?: number) => {
    const myLabel = isFarmer ? 'farmer' : 'buyer';
    const counterpartyLabel = isFarmer ? 'buyer' : 'farmer';
    let text = inputValue.trim();
    const val = value || Number(inputValue);

    if (type === 'COUNTER') {
      if (!val) return;
      text = text || `I'm proposing a counter-offer of ₹${val}/kg.`;
      setCurrentOffer(val);
      setInputValue('');
    } else if (type === 'ACCEPT') {
      text = `Deal confirmed at ₹${currentOffer}/kg. Proceeding with details.`;
      geminiService.speak("Negotiation finalized.");
    } else if (type === 'REJECT') {
      text = `I'm sorry, I cannot proceed with this price.`;
    } else if (type === 'SEND_TEXT') {
      if (!text && !attachedImage) return;
      setInputValue('');
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: myLabel,
      text: text || (attachedImage ? (isFarmer ? "Sharing crop quality photo." : "Sharing delivery requirement photo.") : ""),
      isOffer: type === 'COUNTER',
      offerValue: type === 'COUNTER' ? val : undefined,
      image: attachedImage || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMessage]);
    setAttachedImage(null);

    if (type === 'ACCEPT') {
      setTimeout(() => {
        if (onAcceptDeal) {
          onAcceptDeal({
            id: `deal-${Date.now()}`,
            buyer: isFarmer ? 'VegMart Wholesalers' : 'You',
            farmer: isFarmer ? 'You' : 'Ram Prasad',
            crop: listing.cropName,
            price: currentOffer,
            qty: listing.quantity,
            listingId: listing.id,
            deliveryResponsibility: deliveryResponsibility === 'FARMER' ? 'FARMER_ARRANGED' : 'BUYER_ARRANGED',
            date: 'Just now'
          });
        }
      }, 1200);
      return;
    }

    if (type === 'COUNTER') {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const isClose = Math.abs(val - marketPrice) / marketPrice < 0.1;
        const reply: Message = {
          id: (Date.now() + 1).toString(),
          sender: counterpartyLabel,
          text: isClose 
            ? `Price looks fair. I accept ₹${val}.` 
            : `That's a bit high. Can we meet at ₹${Math.round(val * 0.95)}?`,
          isOffer: !isClose,
          offerValue: !isClose ? Math.round(val * 0.95) : undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        if (isClose) setCurrentOffer(val);
        else if (reply.offerValue) setCurrentOffer(reply.offerValue);
        
        setMessages(prev => [...prev, reply]);
        if (isClose) geminiService.speak("Counter-offer accepted.");
      }, 2500);
    }
  };

  const calculateDiff = () => {
    const diff = ((currentOffer - marketPrice) / marketPrice) * 100;
    return diff.toFixed(1);
  };

  const getPriceSentiment = () => {
    const diff = Number(calculateDiff());
    if (diff > 15) return { label: 'Premium', color: 'text-red-400', bg: 'bg-red-500' };
    if (diff > 5) return { label: 'High', color: 'text-amber-400', bg: 'bg-amber-500' };
    if (diff < -5) return { label: 'Bargain', color: 'text-blue-400', bg: 'bg-blue-500' };
    return { label: 'Fair', color: 'text-emerald-400', bg: 'bg-emerald-500' };
  };

  const sentiment = getPriceSentiment();
  const progressWidthClass = (() => {
    const widthClasses = [
      'w-[10%]',
      'w-[15%]',
      'w-[20%]',
      'w-1/4',
      'w-[30%]',
      'w-[35%]',
      'w-[40%]',
      'w-[45%]',
      'w-1/2',
      'w-[55%]',
      'w-[60%]',
      'w-[65%]',
      'w-[70%]',
      'w-[75%]',
      'w-[80%]',
      'w-[85%]',
      'w-[90%]',
      'w-[95%]',
      'w-full'
    ];

    const percent = Math.min(100, Math.max(10, 50 + Number(calculateDiff()) * 2));
    const snapped = Math.min(100, Math.max(10, Math.round(percent / 5) * 5));
    const idx = Math.min(widthClasses.length - 1, Math.max(0, Math.round((snapped - 10) / 5)));
    return widthClasses[idx];
  })();

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-in fade-in slide-in-from-bottom duration-300">
      <header className="bg-white border-b px-6 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-5">
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 active:scale-90 transition-all shadow-sm" aria-label="Back">
            <i className="fas fa-chevron-left"></i>
          </button>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${isFarmer ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
               <i className={`fas ${isFarmer ? 'fa-user-tie' : 'fa-tractor'}`}></i>
            </div>
            <div>
              <h3 className="font-black text-gray-900 leading-none mb-1.5">{isFarmer ? 'VegMart' : 'Ram Prasad'}</h3>
              <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                 <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{listing.cropName} • {listing.quantity}kg</p>
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => geminiService.speak("Support bridge established.")} className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-green-50 hover:text-green-600 transition-all shadow-sm" aria-label="Support">
          <i className="fas fa-headset"></i>
        </button>
      </header>

      <div className="bg-gray-900 text-white px-8 py-8 border-b border-gray-800">
        <div className="flex justify-between items-end mb-8">
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Benchmark</p>
            <p className="text-2xl font-black tracking-tight">₹{marketPrice}<span className="text-xs text-gray-500 ml-1">/kg</span></p>
          </div>
          <div className="text-center bg-white/5 border border-white/10 px-8 py-4 rounded-[32px] backdrop-blur-md">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1.5">Last Bid</p>
            <p className="text-4xl font-black tracking-tighter text-amber-400">₹{currentOffer}</p>
          </div>
          <div className="space-y-1.5 text-right">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Vs Mandi</p>
            <p className={`text-2xl font-black tracking-tight ${sentiment.color}`}>
              {Number(calculateDiff()) > 0 ? '+' : ''}{calculateDiff()}%
            </p>
          </div>
        </div>
        <div className="relative h-2 w-full bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(34,197,94,0.3)] ${sentiment.bg} ${progressWidthClass}`}
          ></div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-grow overflow-y-auto p-8 space-y-10 bg-gray-50/50 no-scrollbar">
        {messages.map(m => {
          const isMe = m.sender === (isFarmer ? 'farmer' : 'buyer');
          if (m.sender === 'system') {
            return (
              <div key={m.id} className="flex justify-center">
                <span className="bg-white/80 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full px-6 py-2 border border-gray-100 backdrop-blur-md shadow-sm">
                  <i className="fas fa-fingerprint mr-2 text-emerald-500"></i> {m.text}
                </span>
              </div>
            );
          }

          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] relative ${isMe ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block rounded-[36px] overflow-hidden shadow-sm ${
                  isMe ? 'bg-gray-900 text-white rounded-br-none' : 
                  'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                }`}>
                  {m.image && (
                    <img src={m.image} className="w-full h-auto max-h-72 object-cover border-b border-white/10" alt="Harvest Photo" />
                  )}
                  {m.isOffer ? (
                    <div className="p-6">
                       <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isMe ? 'bg-green-600' : 'bg-blue-500'} text-white text-base shadow-sm`}>
                             <i className="fas fa-tags"></i>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Proposed Settlement</span>
                       </div>
                       <p className="text-3xl font-black mb-3 tracking-tighter">₹{m.offerValue}/kg</p>
                       <p className="text-sm font-bold opacity-80 leading-relaxed">{m.text}</p>
                       {!isMe && (
                        <div className="grid grid-cols-2 gap-3 mt-6">
                           <button onClick={handleAcceptClick} className="bg-emerald-600 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-emerald-100 active:scale-95 transition-all">Accept</button>
                           <button onClick={() => handleAction('REJECT')} className="bg-white border-2 border-red-50 text-red-500 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all">Decline</button>
                        </div>
                       )}
                    </div>
                  ) : (
                    <p className={`text-sm font-bold leading-relaxed ${m.image ? 'p-5' : 'px-6 py-5'}`}>{m.text}</p>
                  )}
                </div>
                <div className={`mt-2.5 text-[9px] font-black uppercase tracking-widest text-gray-300 flex items-center gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span>{m.timestamp}</span>
                  {isMe && <i className="fas fa-check-double text-blue-400"></i>}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-[24px] px-6 py-4 flex gap-2 shadow-sm">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t pb-10">
        {attachedImage && (
          <div className="mb-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="relative inline-block">
              <img src={attachedImage} className="w-28 h-28 rounded-[32px] object-cover border-4 border-white shadow-2xl" alt="Attachment Preview" />
              <button 
                onClick={() => setAttachedImage(null)}
                className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center text-sm shadow-xl border-2 border-white active:scale-90"
                aria-label="Remove image"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4 items-end">
          <input 
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
            aria-label="Upload photo"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 bg-gray-50 text-gray-400 rounded-[24px] flex items-center justify-center shrink-0 hover:bg-green-50 hover:text-green-600 transition-all active:scale-90 shadow-sm"
            aria-label="Take photo"
          >
            <i className="fas fa-camera text-2xl"></i>
          </button>
          
          <div className="flex-grow bg-gray-50 rounded-[32px] p-1.5 flex items-center border border-gray-100 focus-within:border-blue-200 focus-within:ring-8 focus-within:ring-blue-50 transition-all shadow-inner">
            <input 
              type="text"
              placeholder="Suggest price or type message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAction(isNaN(Number(inputValue)) || inputValue.trim() === '' ? 'SEND_TEXT' : 'COUNTER')}
              className="flex-grow bg-transparent px-6 py-4 font-bold text-gray-900 outline-none placeholder:text-gray-300"
              aria-label="Message or Offer"
            />
            <button 
              onClick={() => handleAction(isNaN(Number(inputValue)) || inputValue.trim() === '' ? 'SEND_TEXT' : 'COUNTER')}
              className="w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center mr-1 active:scale-90 shadow-lg"
              aria-label="Send"
            >
              <i className={`fas ${(isNaN(Number(inputValue)) || inputValue.trim() === '') && !attachedImage ? 'fa-paper-plane' : 'fa-arrow-up'} text-lg`}></i>
            </button>
          </div>
        </div>
        
        <div className="flex justify-center gap-10 mt-6">
           <button onClick={handleAcceptClick} className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 hover:text-emerald-700 transition-colors">Accept Deal</button>
           <button onClick={() => handleAction('REJECT')} className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400 hover:text-red-500 transition-colors">Withdraw Bid</button>
        </div>
      </div>

      {showDeliveryModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 mb-6 text-center">Finalize Delivery</h3>
            
            <div className="space-y-4 mb-8">
              <button
                onClick={() => setDeliveryResponsibility('FARMER')}
                className={`w-full p-6 rounded-[24px] border-2 text-left transition-all ${
                  deliveryResponsibility === 'FARMER'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                    deliveryResponsibility === 'FARMER' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <i className="fas fa-tractor"></i>
                  </div>
                  <div>
                    <h4 className={`font-bold ${deliveryResponsibility === 'FARMER' ? 'text-gray-900' : 'text-gray-600'}`}>Farmer Arranges</h4>
                    <p className="text-xs text-gray-400 mt-1">Farmer handles transport to market</p>
                  </div>
                  {deliveryResponsibility === 'FARMER' && (
                    <i className="fas fa-check-circle text-green-500 text-xl ml-auto"></i>
                  )}
                </div>
              </button>

              <button
                onClick={() => setDeliveryResponsibility('BUYER')}
                className={`w-full p-6 rounded-[24px] border-2 text-left transition-all ${
                  deliveryResponsibility === 'BUYER'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                    deliveryResponsibility === 'BUYER' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <i className="fas fa-truck-loading"></i>
                  </div>
                  <div>
                    <h4 className={`font-bold ${deliveryResponsibility === 'BUYER' ? 'text-gray-900' : 'text-gray-600'}`}>Buyer Arranges</h4>
                    <p className="text-xs text-gray-400 mt-1">Buyer picks up from farm</p>
                  </div>
                  {deliveryResponsibility === 'BUYER' && (
                    <i className="fas fa-check-circle text-blue-500 text-xl ml-auto"></i>
                  )}
                </div>
              </button>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeliveryModal(false)}
                className="flex-1 py-4 rounded-[20px] font-bold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAccept}
                className="flex-1 bg-gray-900 text-white py-4 rounded-[20px] font-bold shadow-lg shadow-gray-200 active:scale-95 transition-all"
              >
                Confirm Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatNegotiation;
