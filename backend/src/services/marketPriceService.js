const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// In-memory cache for market prices
const priceCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Helper to get today's date string
const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

// Helper to check if cache is valid
const isCacheValid = (cacheEntry) => {
    if (!cacheEntry) return false;
    const today = getTodayDateString();
    return cacheEntry.date === today && Date.now() < cacheEntry.expiresAt;
};

// MSP (Minimum Support Price) data for common crops (2024-25 season)
const MSP_DATA = {
    'Tomato': 18,
    'Wheat': 22.75,
    'Rice': 21.83,
    'Onion': 16,
    'Potato': 12,
    'Cotton': 64.62,
    'Soybean': 46.00,
    'Maize': 20.40
};

/**
 * Fetch market prices from India Open Government Data Portal (data.gov.in)
 * This is a placeholder - actual implementation would use the real API
 */
const fetchFromDataGovIn = async (cropName, state = 'Andhra Pradesh') => {
    try {
        // Note: The actual data.gov.in API requires registration and API key
        // For now, we'll return null to trigger fallback
        // In production, implement actual API call here:
        // const response = await fetch(`https://api.data.gov.in/resource/...`);

        console.log(`[DataGovIn] Attempting to fetch price for ${cropName} in ${state}`);
        return null; // Fallback to AI
    } catch (error) {
        console.error('[DataGovIn] API Error:', error.message);
        return null;
    }
};

/**
 * Fetch market price using Gemini AI as fallback
 */
const fetchFromGeminiAI = async (cropName, location) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            console.warn('[GeminiAI] No API key found');
            return null;
        }

        const prompt = `You are a market price data provider for agricultural commodities in India.

Provide current realistic market price (mandi bhav) for ${cropName} in ${location}, India.

Return ONLY valid JSON in this exact format:
{
  "crop": "${cropName}",
  "mandi": "string (market name)",
  "min": number (minimum price in ₹/kg),
  "max": number (maximum price in ₹/kg),
  "avg": number (average price in ₹/kg),
  "date": "${getTodayDateString()}"
}

Use realistic prices based on current market trends. Prices should be in rupees per kilogram.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${encodeURIComponent(apiKey)}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            console.warn('[GeminiAI] API request failed:', response.status);
            return null;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const priceData = JSON.parse(jsonMatch[0]);

        // Validate response
        if (priceData.min && priceData.max && priceData.avg) {
            console.log(`[GeminiAI] Successfully fetched price for ${cropName}`);
            return priceData;
        }

        return null;
    } catch (error) {
        console.error('[GeminiAI] Error:', error.message);
        return null;
    }
};

/**
 * Generate mock realistic prices as final fallback
 */
const generateMockPrice = (cropName, location = 'Guntur') => {
    const msp = MSP_DATA[cropName] || 20;

    // Generate realistic price range around MSP
    const min = Math.round(msp * 0.9 * 10) / 10;
    const max = Math.round(msp * 1.3 * 10) / 10;
    const avg = Math.round(((min + max) / 2) * 10) / 10;

    // Format mandi name based on location
    const mandi = location.includes('Mandi') ? location : `${location} Mandi`;

    return {
        crop: cropName,
        mandi,
        min,
        max,
        avg,
        date: getTodayDateString()
    };
};

/**
 * Get market price for a specific crop with multi-source fallback
 */
const getPriceForCrop = async (cropId, location = 'Andhra Pradesh') => {
    try {
        // Get crop details
        const crop = await prisma.crop.findUnique({
            where: { id: cropId },
            select: { id: true, name: true, icon: true }
        });

        if (!crop) {
            throw new Error('Crop not found');
        }

        const cacheKey = `price_${cropId}_${getTodayDateString()}`;
        const cached = priceCache.get(cacheKey);

        if (isCacheValid(cached)) {
            console.log(`[Cache] Returning cached price for ${crop.name}`);
            return cached.data;
        }

        // Check database for today's price
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dbPrice = await prisma.marketPrice.findFirst({
            where: {
                cropId: crop.id,
                date: { gte: today }
            },
            orderBy: { date: 'desc' }
        });

        if (dbPrice) {
            const priceData = {
                cropId: dbPrice.cropId,
                crop: crop.name,
                icon: crop.icon,
                mandi: dbPrice.mandi,
                min: dbPrice.min,
                max: dbPrice.max,
                avg: dbPrice.avg,
                msp: MSP_DATA[crop.name] || null,
                date: getTodayDateString()
            };

            // Cache it
            priceCache.set(cacheKey, {
                data: priceData,
                date: getTodayDateString(),
                expiresAt: Date.now() + CACHE_TTL
            });

            return priceData;
        }

        // Try fetching from external sources
        console.log(`[Service] Fetching new price for ${crop.name}`);

        let priceData = await fetchFromDataGovIn(crop.name, location);

        if (!priceData) {
            priceData = await fetchFromGeminiAI(crop.name, location);
        }

        if (!priceData) {
            console.log(`[Service] Using mock data for ${crop.name}`);
            priceData = generateMockPrice(crop.name, location);
        }

        // Format mandi name based on location
        const mandiName = location.includes('Mandi') ? location : `${location} Mandi`;

        // Store in database
        await prisma.marketPrice.create({
            data: {
                cropId: crop.id,
                mandi: priceData.mandi || mandiName,
                min: priceData.min,
                max: priceData.max,
                avg: priceData.avg,
                source: priceData.source || 'AI',
                date: new Date()
            }
        });

        const result = {
            cropId: crop.id,
            crop: crop.name,
            icon: crop.icon,
            mandi: priceData.mandi || mandiName,
            min: priceData.min,
            max: priceData.max,
            avg: priceData.avg,
            msp: MSP_DATA[crop.name] || null,
            date: getTodayDateString()
        };

        // Cache it
        priceCache.set(cacheKey, {
            data: result,
            date: getTodayDateString(),
            expiresAt: Date.now() + CACHE_TTL
        });

        return result;
    } catch (error) {
        console.error('[getPriceForCrop] Error:', error);
        throw error;
    }
};

/**
 * Get today's prices for all crops
 */
const getTodaysPrices = async (location = 'Andhra Pradesh') => {
    try {
        const cacheKey = `all_prices_${getTodayDateString()}`;
        const cached = priceCache.get(cacheKey);

        if (isCacheValid(cached)) {
            console.log('[Cache] Returning cached prices for all crops');
            return cached.data;
        }

        // Get all active crops
        const crops = await prisma.crop.findMany({
            where: { isActive: true },
            select: { id: true, name: true, icon: true }
        });

        // Fetch prices for each crop
        const pricePromises = crops.map(crop =>
            getPriceForCrop(crop.id, location).catch(err => {
                console.error(`Error fetching price for ${crop.name}:`, err);
                return null;
            })
        );

        const prices = (await Promise.all(pricePromises)).filter(p => p !== null);

        // Cache the result
        priceCache.set(cacheKey, {
            data: prices,
            date: getTodayDateString(),
            expiresAt: Date.now() + CACHE_TTL
        });

        return prices;
    } catch (error) {
        console.error('[getTodaysPrices] Error:', error);
        throw error;
    }
};

/**
 * Calculate smart price suggestion based on market data and crop quality
 */
const calculatePriceSuggestion = async (cropId, grade = 'Good', quantity = 100) => {
    try {
        const priceData = await getPriceForCrop(cropId);

        if (!priceData) {
            throw new Error('Unable to fetch market price');
        }

        const { min, max, avg } = priceData;

        // Grade multipliers
        const gradeMultipliers = {
            'Premium': 1.10,  // 10% above average
            'Good': 1.05,     // 5% above average
            'Average': 1.00,  // At average
            'Fair': 0.95      // 5% below average
        };

        const multiplier = gradeMultipliers[grade] || 1.00;

        // Quantity adjustment (bulk discount for large quantities)
        let quantityAdjustment = 1.0;
        if (quantity >= 1000) {
            quantityAdjustment = 0.98; // 2% discount for bulk
        } else if (quantity >= 500) {
            quantityAdjustment = 0.99; // 1% discount
        }

        // Calculate suggested price
        const basePrice = avg * multiplier * quantityAdjustment;
        const suggestedPrice = Math.round(basePrice * 10) / 10; // Round to 1 decimal

        // Ensure suggested price is within min-max range (with some flexibility)
        const finalPrice = Math.max(min * 0.95, Math.min(max * 1.05, suggestedPrice));

        // Generate reasoning
        let reasoning = `Based on current market average of ₹${avg}/kg`;
        if (grade !== 'Average') {
            reasoning += `, adjusted for ${grade} quality`;
        }
        if (quantity >= 500) {
            reasoning += `, with bulk quantity consideration`;
        }

        return {
            suggestedPrice: Math.round(finalPrice * 10) / 10,
            marketMin: min,
            marketMax: max,
            marketAvg: avg,
            grade,
            reasoning
        };
    } catch (error) {
        console.error('[calculatePriceSuggestion] Error:', error);
        throw error;
    }
};

/**
 * Clear cache (useful for admin refresh)
 */
const clearCache = () => {
    priceCache.clear();
    console.log('[Service] Price cache cleared');
};

const getHistoricalPrices = async (cropId, days = 30, location = 'Andhra Pradesh') => {
    try {
        const crop = await prisma.crop.findUnique({
            where: { id: cropId },
            select: { id: true, name: true }
        });

        if (!crop) {
            throw new Error('Crop not found');
        }

        // Fetch real data from DB
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const dbPrices = await prisma.marketPrice.findMany({
            where: {
                cropId: cropId,
                date: { gte: startDate }
            },
            orderBy: { date: 'asc' }
        });

        // If we have enough data (e.g., > 50% of requested days), return it
        if (dbPrices.length >= days * 0.5) {
            return dbPrices.map(p => ({
                date: p.date.toISOString().split('T')[0],
                avg: p.avg,
                min: p.min,
                max: p.max
            }));
        }

        // Otherwise generate mock trend data for demo
        console.log(`[Service] Generating mock historical data for ${crop.name}`);
        const data = [];
        const today = new Date();
        const msp = MSP_DATA[crop.name] || 20;
        let currentPrice = msp * (1 + (Math.random() * 0.4 - 0.2)); // Start around MSP +/- 20%

        for (let i = days; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            // Random daily fluctuation (+/- 5%)
            const change = (Math.random() * 0.1) - 0.05;
            currentPrice = currentPrice * (1 + change);

            // Ensure price stays within reasonable bounds (MSP * 0.5 to MSP * 2.0)
            currentPrice = Math.max(msp * 0.5, Math.min(msp * 2.0, currentPrice));

            data.push({
                date: dateStr,
                avg: Math.round(currentPrice * 10) / 10,
                min: Math.round(currentPrice * 0.9 * 10) / 10,
                max: Math.round(currentPrice * 1.1 * 10) / 10
            });
        }

        return data;
    } catch (error) {
        console.error('[getHistoricalPrices] Error:', error);
        throw error;
    }
};

const refreshAllPrices = async () => {
    console.log('[Service] Starting daily price refresh...');
    const locations = ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu'];

    // Clear old cache
    priceCache.clear();

    for (const loc of locations) {
        console.log(`[Service] Refreshing prices for ${loc}`);
        await getTodaysPrices(loc);
    }
    console.log('[Service] Daily price refresh completed.');
};

module.exports = {
    getTodaysPrices,
    getPriceForCrop,
    calculatePriceSuggestion,
    clearCache,
    fetchFromGeminiAI,
    generateMockPrice,
    getHistoricalPrices,
    refreshAllPrices
};
