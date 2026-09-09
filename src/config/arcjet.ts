import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";

const isDev = process.env.NODE_ENV === 'development';
const railwayDomain = process.env.RAILWAY_DOMAIN;

if (!process.env.ARCJET_KEY && process.env.NODE_ENV !== "test") {
  throw new Error("ARCJET_KEY env is required.");
}

export const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  
  // Fixed: Use spread operator correctly
  // In development: use IP
  // In production: use domain
  ...(isDev 
    ? { publicIp: '127.0.0.1' }
    : { 
        // Use domain instead of IP for Railway
        publicIp: railwayDomain || 'railway-app',
        // Use host header detection
        host: railwayDomain || 'railway-app',
      }
  ),
  
  rules: [
    shield({ 
      mode: isDev ? "DRY_RUN" : "LIVE" 
    }),
    detectBot({
      mode: isDev ? "DRY_RUN" : "LIVE",
      
      // TODO: Remove POSTMAN in production!
      allow: isDev 
        ? ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW", "POSTMAN"]
        : ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"], // POSTMAN removed in prod
    }),
    // Create a token bucket rate limit. Other algorithms are supported.
    slidingWindow({
      mode: "LIVE",
      interval: "2s",
      max: 5,
    }),
  ],
});