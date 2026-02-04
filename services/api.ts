const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/+$/, '')}/api`;

// Helper function to get auth token
const getAuthToken = () => {
    return localStorage.getItem('token');
};

// Helper function to make authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    if (!token) {
        console.warn('Attempting fetchWithAuth without token for:', url);
    }
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
};

// Listing APIs
export const listingAPI = {
    getAll: (params?: Record<string, string>) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return fetchWithAuth(`${API_URL}/listings${query}`);
    },

    search: (q: string) => {
        return fetchWithAuth(`${API_URL}/listings/search?q=${encodeURIComponent(q)}`);
    },

    getById: (id: string) => {
        return fetchWithAuth(`${API_URL}/listings/${id}`);
    },

    create: (data: any) => {
        return fetchWithAuth(`${API_URL}/listings`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update: (id: string, data: any) => {
        return fetchWithAuth(`${API_URL}/listings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    delete: (id: string) => {
        return fetchWithAuth(`${API_URL}/listings/${id}`, {
            method: 'DELETE',
        });
    },

    getMyListings: () => {
        return fetchWithAuth(`${API_URL}/listings/my/listings`);
    },

    getCrops: () => {
        return fetchWithAuth(`${API_URL}/listings/crops`);
    },
};

// Cart APIs
export const cartAPI = {
    get: () => {
        return fetchWithAuth(`${API_URL}/cart`);
    },

    add: (listingId: string, quantity: number) => {
        return fetchWithAuth(`${API_URL}/cart/add`, {
            method: 'POST',
            body: JSON.stringify({ listingId, quantity }),
        });
    },

    update: (itemId: string, quantity: number) => {
        return fetchWithAuth(`${API_URL}/cart/update/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity }),
        });
    },

    remove: (itemId: string) => {
        return fetchWithAuth(`${API_URL}/cart/remove/${itemId}`, {
            method: 'DELETE',
        });
    },

    checkout: (deliveryResponsibility: 'FARMER_ARRANGED' | 'BUYER_ARRANGED') => {
        return fetchWithAuth(`${API_URL}/cart/checkout`, {
            method: 'POST',
            body: JSON.stringify({ deliveryResponsibility }),
        });
    },
};

// Order APIs
export const orderAPI = {
    getAll: () => {
        return fetchWithAuth(`${API_URL}/orders`);
    },

    getById: (id: string) => {
        return fetchWithAuth(`${API_URL}/orders/${id}`);
    },

    create: (data: any) => {
        return fetchWithAuth(`${API_URL}/orders/create`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    setDeliveryOption: (id: string, deliveryResponsibility: string) => {
        return fetchWithAuth(`${API_URL}/orders/${id}/delivery-option`, {
            method: 'PUT',
            body: JSON.stringify({ deliveryResponsibility }),
        });
    },
};

// Delivery Deal APIs
export const deliveryDealAPI = {
    create: (data: any) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/create`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    getAvailable: () => {
        return fetchWithAuth(`${API_URL}/delivery-deals/available`);
    },

    accept: (id: string) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/${id}/accept`, {
            method: 'POST',
        });
    },

    decline: (id: string) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/${id}/decline`, {
            method: 'POST',
        });
    },

    verifyOtp: (id: string, otp: string) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/${id}/verify-otp`, {
            method: 'POST',
            body: JSON.stringify({ otp }),
        });
    },

    updateStatus: (id: string, status: string) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    },

    getTracking: (id: string) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/${id}/tracking`);
    },
};

// Auth APIs
export const authAPI = {
    login: (phone: string, password: string) => {
        return fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password }),
        }).then(res => res.json());
    },

    register: (data: any) => {
        return fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(res => res.json());
    },
};

export default {
    listing: listingAPI,
    cart: cartAPI,
    order: orderAPI,
    deliveryDeal: deliveryDealAPI,
    auth: authAPI,
};
