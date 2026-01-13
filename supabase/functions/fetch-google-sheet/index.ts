
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sheetUrl } = await req.json()

    if (!sheetUrl) {
      throw new Error('Missing sheetUrl')
    }

    let downloadUrl = sheetUrl

    // Basic logic to convert a standard Google Sheet edit URL to a CSV export URL
    // e.g., https://docs.google.com/spreadsheets/d/DOC_ID/edit#gid=0
    // to      https://docs.google.com/spreadsheets/d/DOC_ID/export?format=csv
    // NOTE: Ignore "Published to Web" links (containing /d/e/) as they are usually already in the correct format or handled set differently
    if (sheetUrl.includes('docs.google.com/spreadsheets') && !sheetUrl.includes('/d/e/')) {
       // Extract the Doc ID
       const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
       if (match && match[1]) {
         const docId = match[1];
         downloadUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
       }
    }

    console.log(`Fetching CSV from: ${downloadUrl}`)

    const response = await fetch(downloadUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()
    
    // Check if the response looks like HTML (login page or error page) instead of CSV
    if (text.trim().toLowerCase().startsWith('<!doctype html') || text.includes('<html')) {
        throw new Error('The sheet seems to be private or the link is invalid. Please ensure the sheet is "Anyone with the link can view".');
    }

    return new Response(JSON.stringify({ csvData: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
