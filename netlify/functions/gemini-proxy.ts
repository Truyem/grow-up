import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

// Load API keys from server environment variables
const getGeminiApiKeys = (): string[] => {
  const keys: string[] = [];
  
  // Support numbered API keys: API_KEY_1, API_KEY_2, etc.
  for (let i = 1; i <= 20; i++) {
    const key = Netlify.env.get(`API_KEY_${i}`);
    if (key) {
      keys.push(key);
    }
  }

  // Fallback to single API_KEY if no numbered keys found
  if (keys.length === 0) {
    const singleKey = Netlify.env.get("API_KEY");
    if (singleKey) {
      keys.push(singleKey);
    }
  }

  return keys;
};

const GEMINI_API_KEYS = getGeminiApiKeys();
const RATE_LIMIT_RESET_MS = 60 * 1000; // 1 minute reset

// Track rate-limited keys server-side
const rateLimitedKeys: Map<number, number> = new Map();
let currentKeyIndex = 0;

const getCurrentApiKey = (): string | null => {
  if (GEMINI_API_KEYS.length === 0) return null;
  
  // Clean up expired rate limits
  const now = Date.now();
  for (const [index, timestamp] of rateLimitedKeys.entries()) {
    if (now - timestamp > RATE_LIMIT_RESET_MS) {
      rateLimitedKeys.delete(index);
    }
  }
  
  // Find first available key
  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const checkIndex = (currentKeyIndex + i) % GEMINI_API_KEYS.length;
    if (!rateLimitedKeys.has(checkIndex)) {
      currentKeyIndex = checkIndex;
      return GEMINI_API_KEYS[checkIndex];
    }
  }
  
  // All keys rate limited, reset oldest
  if (rateLimitedKeys.size > 0) {
    const oldest = Array.from(rateLimitedKeys.entries()).sort((a, b) => a[1] - b[1])[0];
    rateLimitedKeys.delete(oldest[0]);
    currentKeyIndex = oldest[0];
    return GEMINI_API_KEYS[currentKeyIndex];
  }
  
  return null;
};

const markCurrentKeyRateLimited = (): void => {
  rateLimitedKeys.set(currentKeyIndex, Date.now());
};

const isRateLimitError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('quota') ||
      message.includes('resource exhausted');
  }
  return false;
};

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed, use POST" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { base64Image, mimeType, prompt, isVideo = false } = body;

    if (!base64Image) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "base64Image is required" })
      };
    }

    if (GEMINI_API_KEYS.length === 0) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No Gemini API keys configured on server" })
      };
    }

    let retriesLeft = GEMINI_API_KEYS.length;
    let apiKey = getCurrentApiKey();

    while (retriesLeft > 0 && apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-lite",
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Image } }
              ]
            }
          ],
        });

        const foodDescription = response.text || "";
        
        if (!foodDescription) {
          throw new Error("Empty recognition response from Gemini");
        }

        // Return success response with API status for client tracking
        return {
          statusCode: 200,
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
          },
          body: JSON.stringify({
            success: true,
            foodDescription,
            apiStatus: {
              totalKeys: GEMINI_API_KEYS.length,
              activeKeysCount: GEMINI_API_KEYS.length - rateLimitedKeys.size,
              rateLimitedKeysCount: rateLimitedKeys.size,
              currentKeyIndex
            }
          })
        };

      } catch (error) {
        console.error(`Gemini proxy error (attempt ${GEMINI_API_KEYS.length - retriesLeft + 1}):`, error);
        
        if (isRateLimitError(error) && retriesLeft > 1) {
          markCurrentKeyRateLimited();
          apiKey = getCurrentApiKey();
          retriesLeft--;
          continue;
        }

        // Re-throw other errors
        throw error;
      }
    }

    throw new Error("All Gemini API keys exhausted");

  } catch (error: unknown) {
    console.error("Gemini proxy handler error:", error);
    
    const statusCode = isRateLimitError(error) ? 429 : 500;
    const errorMessage = error instanceof Error ? error.message : "Internal server error";

    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: errorMessage,
        isRateLimit: isRateLimitError(error)
      })
    };
  }
};
