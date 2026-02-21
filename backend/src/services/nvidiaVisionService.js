const fetch = require('node-fetch');

const safeJsonParse = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const unfenced = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    try {
        return JSON.parse(unfenced);
    } catch { }
    const firstObj = unfenced.indexOf('{');
    const lastObj = unfenced.lastIndexOf('}');
    if (firstObj >= 0 && lastObj > firstObj) {
        const candidate = unfenced.slice(firstObj, lastObj + 1);
        try {
            return JSON.parse(candidate);
        } catch { }
    }
    return null;
};

const validateNvidiaApiKey = (apiKey) => {
    const k = String(apiKey || '').trim();
    if (!k) return { ok: false, reason: 'Missing NVIDIA_API_KEY' };
    if (!k.startsWith('nvapi-')) return { ok: false, reason: 'Invalid NVIDIA_API_KEY format' };
    if (k.length < 20) return { ok: false, reason: 'Invalid NVIDIA_API_KEY length' };
    return { ok: true, value: k };
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const callNvidiaChat = async ({ model, messages, max_tokens = 800, temperature = 0.2, top_p = 1, retries = 1, requestTag = 'nvidiaChat', fetchImpl = fetch, extraParams = {} }) => {
    const apiKey = process.env.NVIDIA_API_KEY || '';
    const validated = validateNvidiaApiKey(apiKey);
    if (!validated.ok) {
        const err = new Error(validated.reason);
        err.status = 500;
        throw err;
    }

    const url = 'https://integrate.api.nvidia.com/v1/chat/completions';
    let attempt = 0;
    while (true) {
        attempt += 1;
        const start = Date.now();
        const res = await fetchImpl(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${validated.value}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens,
                temperature,
                top_p,
                stream: false,
                ...extraParams
            })
        });
        const elapsed = Date.now() - start;
        console.log(`[NVIDIA] API call (${requestTag}) attempt ${attempt} took ${elapsed}ms`);

        const retryAfterHeader = res.headers?.get ? res.headers.get('retry-after') : null;
        const json = await res.json().catch(() => null);
        if (res.ok) return json;

        const status = res.status;
        const message = (json && (json.error?.message || json.error)) || `HTTP ${status}`;
        const canRetry = attempt <= retries && (status === 429 || status === 500 || status === 502 || status === 503 || status === 504);
        if (!canRetry) {
            console.error('[NVIDIA] request failed', { requestTag, status, attempt, message });
            const err = new Error(message);
            err.status = status;
            err.details = json;
            throw err;
        }

        let waitMs = Math.min(15_000, 500 * (2 ** (attempt - 1)));
        const jitter = Math.floor(Math.random() * 200);
        waitMs += jitter;
        const retryAfterSeconds = Number(retryAfterHeader);
        if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
            waitMs = Math.max(waitMs, Math.min(60_000, retryAfterSeconds * 1000));
        }
        console.warn('[NVIDIA] retrying', { requestTag, status, attempt, waitMs });
        await wait(waitMs);
    }
};

const extractAssistantText = (payload) => {
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return '';
    // Strip any <think>...</think> tags if present
    const thinkEnd = content.lastIndexOf('</think>');
    if (thinkEnd >= 0) {
        return content.slice(thinkEnd + '</think>'.length).trim();
    }
    return content.trim();
};

const buildVisionContent = (images, query) => {
    const firstImg = images.find(img => typeof img === 'string' && img.startsWith('data:image/'));
    if (!firstImg) return query;
    // Standard OpenAI/NIM Vision format
    return [
        { type: 'text', text: query },
        { type: 'image_url', image_url: { url: firstImg } }
    ];
};

const analyzeCropImages = async ({ images, expectedCropName }) => {
    const query = [
        'SYSTEM: You are a strict Agronomist Quality Inspector.',
        'INSTRUCTION: Look closely at the image textures. Identify the crop exactly.',
        'If you see a bumpy, white, curd-like texture, it is CAULIFLOWER, not potato.',
        'Describe its quality, color, freshness, and any defects in 3-4 detailed sentences.',
        'Grade it as: Premium, Excellent, Good, or Fair.',
        expectedCropName ? `Verification context: User thinks this is "${expectedCropName}".` : '',
        'Reply ONLY with valid JSON (no markdown pods): {"detectedCrop": "Name", "confidence": 0.0, "summary": "...", "grade": "..."}'
    ].filter(Boolean).join('\n');

    const model = 'meta/llama-3.2-11b-vision-instruct';
    const max_tokens = 512;

    const payload = await callNvidiaChat({
        model,
        requestTag: 'analyzeCropImages',
        max_tokens,
        temperature: 0.1, // Lower temperature for more factual identification
        top_p: 1.0,
        retries: 0,
        messages: [
            { role: 'user', content: buildVisionContent(images, query) }
        ]
    });

    if (!payload || !payload.choices) {
        console.error('[NVIDIA] Invalid response:', JSON.stringify(payload));
        return { rawText: '', parsed: null };
    }

    const text = extractAssistantText(payload);
    const parsed = safeJsonParse(text);
    return { rawText: text, parsed };
};


module.exports = {
    analyzeCropImages,
    safeJsonParse,
    validateNvidiaApiKey,
    callNvidiaChat
};

