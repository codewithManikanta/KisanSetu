
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

export enum ListingStatus {
  AVAILABLE = 'AVAILABLE',
  PRICE_AGREED = 'PRICE_AGREED',
  LOCKED = 'LOCKED',
  IN_DELIVERY = 'IN_DELIVERY',
  SOLD = 'SOLD'
}

export enum OrderStatus {
  ORDER_CREATED = 'ORDER_CREATED',
  DELIVERY_PENDING = 'DELIVERY_PENDING',
  IN_DELIVERY = 'IN_DELIVERY',
  COMPLETED = 'COMPLETED'
}

export enum DeliveryStatus {
  WAITING_FOR_TRANSPORTER = 'WAITING_FOR_TRANSPORTER',
  TRANSPORTER_ASSIGNED = 'TRANSPORTER_ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED'
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
  grade: string;
  harvestDate: string;
  images: string[];
  status: ListingStatus;
  location: string;
  crop?: Crop;
  farmer?: {
    id: string;
    name?: string;
    phone?: string;
    village?: string;
    district?: string;
    state?: string;
    location?: string;
  };
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
  orderId?: string;
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

export interface Order {
  id: string;
  listingId: string;
  buyerId: string;
  farmerId: string;
  quantity: number;
  priceFinal: number;
  deliveryResponsibility: 'FARMER_ARRANGED' | 'BUYER_ARRANGED';
  orderStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
  listing?: Listing;
  buyer?: User;
  farmer?: User;
  delivery?: DeliveryDeal;
}

export interface Cart {
  id: string;
  buyerId: string;
  items: CartItem[];
}

export interface CartItem {
  id: string;
  cartId: string;
  listingId: string;
  quantity: number;
  lockedAt?: string;
  listing?: Listing & { crop: Crop; farmer: User };
}

export interface DeliveryDeal {
  id: string;
  orderId: string;
  transporterId?: string;
  declinedBy?: string[];
  pickupLocation: { address: string; lat: number; lng: number };
  dropLocation: { address: string; lat: number; lng: number };
  pickupOtp?: string;
  deliveryOtp?: string;
  status: DeliveryStatus;
  pricePerKm: number;
  distance: number;
  totalCost: number;
  pickupTimestamp?: string;
  deliveryTimestamp?: string;
  createdAt: string;
  updatedAt: string;
  order?: Order;
  transporter?: User;
}
