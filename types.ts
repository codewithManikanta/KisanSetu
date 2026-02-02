
export enum UserRole {
  FARMER = 'FARMER',
  BUYER = 'BUYER',
  TRANSPORTER = 'TRANSPORTER',
  ADMIN = 'ADMIN'
}

export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi',
  TELUGU = 'te',
  TAMIL = 'ta',
  KANNADA = 'kn'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  language: Language;
  name: string;
  gender?: Gender;
  email?: string;
  bio?: string;
  location?: {
    village: string;
    district: string;
    state: string;
  };
}

export interface Crop {
  id: string;
  name: string;
  category: string;
  icon: string;
}

export interface Listing {
  id: string;
  farmerId: string;
  cropId: string;
  quantity: number; // in kg
  unit: 'kg' | 'quintal';
  expectedPrice: number; // per kg
  mandiPrice?: number;
  msp?: number;
  grade: 'Premium' | 'Good' | 'Average' | 'Fair';
  harvestDate: string;
  images: string[];
  status: 'AVAILABLE' | 'SOLD' | 'NEGOTIATING';
  location: string;
}

export interface NegotiatingChat {
  id: string;
  listingId: string;
  buyerId: string;
  farmerId: string;
  currentOffer: number;
  status: 'OPEN' | 'ACCEPTED' | 'REJECTED';
  lastMessage: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  type: 'TEXT' | 'OFFER';
  offerValue?: number;
  timestamp: string;
}

export interface MarketPrice {
  cropId: string;
  mandi: string;
  min: number;
  max: number;
  avg: number;
  date: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  transporterId?: string;
  status: 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';
  cost: number;
  distance: number;
}
