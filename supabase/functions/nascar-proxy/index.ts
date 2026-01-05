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
      
      case 'driverlist': {
        const series = url.searchParams.get('series') || 'cup';
        const season = url.searchParams.get('season') || new Date().getFullYear().toString();
        const seriesId = SERIES_MAP[series.toLowerCase()] || 1;
        
        cacheKey = `driverlist_${seriesId}_${season}`;
        cacheDuration = CACHE_DURATION_DETAIL;
        
        data = getCached(cacheKey, cacheDuration);
        if (!data) {
          // Try current season first using cf.nascar.com cacher API (same as race list)
          // Get a completed race from previous season to extract drivers
          const fallbackSeason = String(parseInt(season) - 1);
          const raceListUrl = `https://cf.nascar.com/cacher/${fallbackSeason}/${seriesId}/race_list_basic.json`;
          console.log(`Fetching race list for driver extraction: ${raceListUrl}`);
          
          try {
            const raceListResponse = await fetch(raceListUrl, {
              headers: { 'Accept': 'application/json', 'User-Agent': 'NASCAR-Results-App/1.0' },
              signal: AbortSignal.timeout(10000),
            });
            
            if (raceListResponse.ok) {
              const races = await raceListResponse.json();
              // Find a completed race (one with winner_driver_id set)
              const completedRace = Array.isArray(races) ? races.find((r: any) => r.winner_driver_id) : null;
              
              if (completedRace) {
                const raceDetailsUrl = `https://cf.nascar.com/cacher/${fallbackSeason}/${seriesId}/${completedRace.race_id}/weekend-feed.json`;
                console.log(`Fetching race details for drivers: ${raceDetailsUrl}`);
                
                const raceResponse = await fetch(raceDetailsUrl, {
                  headers: { 'Accept': 'application/json', 'User-Agent': 'NASCAR-Results-App/1.0' },
                  signal: AbortSignal.timeout(10000),
                });
                
                if (raceResponse.ok) {
                  const raceData = await raceResponse.json();
                  const weekendRace = raceData.weekend_race?.[0];
                  const results = weekendRace?.results || [];
                  
                  // Extract unique drivers
                  const uniqueDrivers = new Map();
                  results.forEach((r: any) => {
                    if (r.driver_id && !uniqueDrivers.has(r.driver_id)) {
                      uniqueDrivers.set(r.driver_id, {
                        driver_id: r.driver_id,
                        driver_name: r.driver_fullname || `${r.driver_first_name || ''} ${r.driver_last_name || ''}`.trim(),
                        car_number: r.car_number || '',
                        team_name: r.team_name || ''
                      });
                    }
                  });
                  
                  data = Array.from(uniqueDrivers.values());
                  console.log(`Extracted ${(data as any[]).length} drivers from race ${completedRace.race_id}`);
                }
              }
            }
          } catch (fetchError) {
            console.error('Error fetching drivers from race data:', fetchError);
          }
          
          // If still no data, return empty array
          if (!data) {
            console.log('No driver data available, returning empty array');
            data = [];
          }
          
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
          
          // Handle 403/404 for future races that don't have data yet
          if (response.status === 403 || response.status === 404) {
            console.log(`Race ${raceId} data not available yet (${response.status})`);
            data = { 
              results: [], 
              stages: [],
              race_info: null,
              message: 'Race data not available yet - race may not have occurred'
            };
            // Cache this "not available" response for a shorter time
            setCache(cacheKey, data);
            break;
          }
          
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
