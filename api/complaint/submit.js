export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { email, productType, complaintDetails, accountNumber } = body || {};

  if (!email || !productType || !complaintDetails) {
    return res.status(400).json({ error: 'Missing required fields: email, productType, complaintDetails' });
  }

  const accountNum = accountNumber || 'AC1000234567';
  const emailBody = `${complaintDetails.trim()}\n\nAccount Number: ${accountNum}`;

  const apikey = process.env.INTELLECT_API_KEY || 'magicplatform.A8018652167E463eaD986C222F2A42D4';
  const workspaceId = process.env.INTELLECT_WORKSPACE_ID || 'd7d4d536-de17-4354-819a-fff06ba78b23';
  const username = process.env.INTELLECT_USERNAME || 'shivanshpf_indstg';
  const password = process.env.INTELLECT_PASSWORD || 'Intellect@8012';

  const fetchToken = async () => {
    const tokenRes = await fetch('https://api.in.intellectseecstag.com/accesstoken/pfpreview', {
      method: 'GET',
      headers: {
        apikey,
        username,
        password,
      },
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenData?.access_token) {
      throw new Error(tokenData?.message || 'Failed to authenticate with Intellect MagicPlatform');
    }
    return tokenData.access_token;
  };

  try {
    // 1. Obtain access token
    let accessToken = await fetchToken();

    // 2. Invoke grievance asset
    let submitResponse = await fetch('https://api.in.intellectseecstag.com/magicplatform/v1/invokeasset/308f7c96-ef89-4680-9789-6a4afc48b5c2/usecase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey,
        Authorization: `Bearer ${accessToken}`,
        'x-platform-workspaceid': workspaceId,
        Origin: 'https://in.intellectseecstag.com',
      },
      body: JSON.stringify({
        From: email,
        Subject: productType,
        Email_Body: emailBody,
      }),
    });

    // If token expired, refresh once
    if (submitResponse.status === 401 || submitResponse.status === 403) {
      accessToken = await fetchToken();
      submitResponse = await fetch('https://api.in.intellectseecstag.com/magicplatform/v1/invokeasset/308f7c96-ef89-4680-9789-6a4afc48b5c2/usecase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey,
          Authorization: `Bearer ${accessToken}`,
          'x-platform-workspaceid': workspaceId,
          Origin: 'https://in.intellectseecstag.com',
        },
        body: JSON.stringify({
          From: email,
          Subject: productType,
          Email_Body: emailBody,
        }),
      });
    }

    const submitData = await submitResponse.json().catch(() => ({}));

    if (submitResponse.ok || submitResponse.status === 201 || submitResponse.status === 200) {
      const traceId = submitData?.trace_id || submitData?.traceId || submitData?.id || `TKT-${Date.now().toString().slice(-6)}`;
      return res.status(200).json({
        success: true,
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        productType,
        liveApi: true,
        data: submitData,
      });
    } else {
      throw new Error(submitData?.message || submitData?.error || 'Failed to process complaint with MagicPlatform gateway');
    }
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Internal grievance gateway error',
      success: false,
    });
  }
}
