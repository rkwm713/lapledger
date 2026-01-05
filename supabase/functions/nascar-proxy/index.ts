import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION_LIST = 10 * 60 * 1000; // 10 minutes
const CACHE_DURATION_DETAIL = 60 * 60 * 1000; // 1 hour

// Simple rate limiter
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 50;
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip);
  
  if (!limit || now > limit.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (limit.count >= RATE_LIMIT) {
    return false;
  }
  
  limit.count++;
  return true;
}

function getCached(key: string, maxAge: number): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < maxAge) {
    console.log(`Cache hit for: ${key}`);
    return entry.data;
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Series ID mapping
const SERIES_MAP: Record<string, number> = {
  'cup': 1,
  'xfinity': 2,
  'trucks': 3,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
  
  if (!checkRateLimit(clientIP)) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    console.log(`NASCAR Proxy - Action: ${action}, Params: ${url.searchParams.toString()}`);

    let data: unknown;
    let cacheKey: string;
    let cacheDuration: number;

    switch (action) {
      case 'racelist': {
        const series = url.searchParams.get('series') || 'cup';
        const season = url.searchParams.get('season') || new Date().getFullYear().toString();
        const seriesId = SERIES_MAP[series.toLowerCase()] || 1;
        
        cacheKey = `racelist_${seriesId}_${season}`;
        cacheDuration = CACHE_DURATION_LIST;
        
        data = getCached(cacheKey, cacheDuration);
        if (!data) {
          // Use the public cacher API (no auth required)
          const apiUrl = `https://cf.nascar.com/cacher/${season}/${seriesId}/race_list_basic.json`;
          console.log(`Fetching: ${apiUrl}`);
          
          const response = await fetch(apiUrl, {
            headers: { 
              'Accept': 'application/json',
              'User-Agent': 'NASCAR-Results-App/1.0',
            },
            signal: AbortSignal.timeout(10000),
          });
          
          if (!response.ok) {
            console.error(`NASCAR API Error: ${response.status} ${response.statusText}`);
            throw new Error(`NASCAR API returned ${response.status}`);
          }
          
          data = await response.json();
          setCache(cacheKey, data);
        }
        break;
      }
      
      case 'racedetails': {
        const raceId = url.searchParams.get('raceId');
        const series = url.searchParams.get('series') || 'cup';
        const season = url.searchParams.get('season') || new Date().getFullYear().toString();
        const seriesId = SERIES_MAP[series.toLowerCase()] || 1;
        
        if (!raceId) {
          return new Response(
            JSON.stringify({ error: 'raceId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        cacheKey = `racedetails_${seriesId}_${season}_${raceId}`;
        cacheDuration = CACHE_DURATION_DETAIL;
        
        data = getCached(cacheKey, cacheDuration);
        if (!data) {
          // Use the weekend-feed.json endpoint for full race results
          const apiUrl = `https://cf.nascar.com/cacher/${season}/${seriesId}/${raceId}/weekend-feed.json`;
          console.log(`Fetching: ${apiUrl}`);
          
          const response = await fetch(apiUrl, {
            headers: { 
              'Accept': 'application/json',
              'User-Agent': 'NASCAR-Results-App/1.0',
            },
            signal: AbortSignal.timeout(10000),
          });
          
          if (!response.ok) {
            console.error(`NASCAR API Error: ${response.status} ${response.statusText}`);
            throw new Error(`NASCAR API returned ${response.status}`);
          }
          
          data = await response.json();
          setCache(cacheKey, data);
        }
        break;
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: racelist or racedetails' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('NASCAR Proxy Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch NASCAR data. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
