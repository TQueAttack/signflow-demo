import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function updateRestApi(fileUrl: string, proposalRecordId: number): Promise<void> {
  const restApiUrl = Deno.env.get('REST_API_URL');
  const bearerToken = Deno.env.get('REST_API_BEARER_TOKEN');
  
  if (!restApiUrl) {
    throw new Error('REST_API_URL not configured');
  }
  
  if (!bearerToken) {
    throw new Error('REST_API_BEARER_TOKEN not configured');
  }

  console.log(`Calling REST API to update signed URL for proposalRecordId: ${proposalRecordId}`);

  const response = await fetch(restApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({ 
      proposalRecordId,
      url: fileUrl 
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`REST API failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('REST API update result:', result);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName, proposalRecordId } = await req.json();

    if (!pdfBase64 || !fileName || !proposalRecordId) {
      console.error('Missing required fields: pdfBase64, fileName, or proposalRecordId');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pdfBase64, fileName, and proposalRecordId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountName = Deno.env.get('AZURE_STORAGE_ACCOUNT_NAME');
    const containerName = Deno.env.get('AZURE_STORAGE_CONTAINER_NAME');
    const sasToken = Deno.env.get('AZURE_STORAGE_API_KEY');

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
    
    // Azure Blob Storage REST API URL with SAS token (saving to "nem" subfolder)
    const blobPath = `nem/${fileName}`;
    const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}${sasQueryString}`;

    console.log(`Uploading to Azure Blob: ${accountName}/${containerName}/${blobPath}`);

    // Upload using SAS token authentication
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

    const publicBlobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}`;
    console.log(`Successfully uploaded: ${blobPath}`);

    // Update REST API with signed PDF URL
    try {
      await updateRestApi(publicBlobUrl, proposalRecordId);
      console.log('REST API updated successfully');
    } catch (apiError) {
      const apiErrorMsg = apiError instanceof Error ? apiError.message : 'Unknown API error';
      console.error(`Failed to update REST API: ${apiErrorMsg}`);
      // Return success for blob upload but note API failure
      return new Response(
        JSON.stringify({ 
          success: true, 
          blobUrl: publicBlobUrl,
          fileName,
          apiError: apiErrorMsg
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        blobUrl: publicBlobUrl,
        fileName,
        apiUpdated: true
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
