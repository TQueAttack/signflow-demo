import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName } = await req.json();

    if (!pdfBase64 || !fileName) {
      console.error('Missing required fields: pdfBase64 or fileName');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pdfBase64 and fileName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountName = Deno.env.get('AZURE_STORAGE_ACCOUNT_NAME');
    const containerName = Deno.env.get('AZURE_STORAGE_CONTAINER_NAME');
    const sasToken = Deno.env.get('AZURE_STORAGE_API_KEY'); // SAS token (starts with "sv=" or "?sv=")

    if (!accountName || !containerName || !sasToken) {
      console.error('Missing Azure configuration');
      return new Response(
        JSON.stringify({ error: 'Azure configuration not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert base64 to binary
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Ensure SAS token starts with "?" for URL append
    const sasQueryString = sasToken.startsWith('?') ? sasToken : `?${sasToken}`;
    
    // Azure Blob Storage REST API URL with SAS token
    const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${fileName}${sasQueryString}`;

    console.log(`Uploading to Azure Blob: ${accountName}/${containerName}/${fileName}`);

    // Upload using SAS token authentication (token is in URL)
    const response = await fetch(blobUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'x-ms-version': '2020-10-02',
        'Content-Type': 'application/pdf',
        'Content-Length': bytes.length.toString(),
      },
      body: bytes,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Azure upload failed: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Azure upload failed: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const publicBlobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${fileName}`;
    console.log(`Successfully uploaded: ${fileName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        blobUrl: publicBlobUrl,
        fileName 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in upload-signed-pdf function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
