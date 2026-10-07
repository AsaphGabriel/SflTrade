import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const targetUrl = url.searchParams.get('url')
    
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the API key from the incoming request (it comes from the client)
    const apiKey = req.headers.get('x-api-key') || ''
    
    // Validate target URL (only allow sunflower-land API and sfl.world aggregator)
    const targetUrlObj = new URL(targetUrl);
    const h = targetUrlObj.hostname.toLowerCase();
    const isAllowed = 
      h === "sfl.world" || h.endsWith(".sfl.world") ||
      h === "sunflower-land.com" || h.endsWith(".sunflower-land.com");

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Invalid target URL' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prepare headers for the target API
    const targetHeaders = new Headers()
    if (apiKey) {
      targetHeaders.set('x-api-key', apiKey)
      targetHeaders.set('Authorization', apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`)
    }

    // Fetch from target API
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: targetHeaders,
    })

    const data = await response.text()
    
    return new Response(data, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
