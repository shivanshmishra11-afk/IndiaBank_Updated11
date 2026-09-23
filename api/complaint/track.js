// Serverless function for tracking Intellect MagicPlatform complaint status by trace_id
// Compatible with Vercel and standalone Node.js serverless runtimes

let tokenCache = null;

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60000) {
    return tokenCache.token;
  }

  const apikey = process.env.INTELLECT_API_KEY || 'magicplatform.A8018652167E463eaD986C222F2A42D4';
  const username = process.env.INTELLECT_USERNAME || 'shivanshpf_indstg';
  const password = process.env.INTELLECT_PASSWORD || 'Intellect@8012';

  const res = await fetch('https://api.in.intellectseecstag.com/accesstoken/pfpreview', {
    method: 'GET',
    headers: {
      apikey,
      username,
      password,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (data?.access_token) {
    const expiresIn = Number(data.expires_in) || 900;
    tokenCache = {
      token: data.access_token,
      expiresAt: now + expiresIn * 1000,
    };
    return data.access_token;
  }

  throw new Error(data?.message || 'Failed to retrieve access token');
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const traceId = req.query.trace_id || req.query.traceId || (req.url && req.url.split('/').pop()?.split('?')[0]);

  if (!traceId) {
    return res.status(400).json({ error: 'Missing trace_id parameter' });
  }

  const apikey = process.env.INTELLECT_API_KEY || 'magicplatform.A8018652167E463eaD986C222F2A42D4';
  const workspaceId = process.env.INTELLECT_WORKSPACE_ID || 'd7d4d536-de17-4354-819a-fff06ba78b23';

  try {
    const token = await getAccessToken();
    const trackRes = await fetch(`https://api.in.intellectseecstag.com/magicplatform/v1/invokeasset/308f7c96-ef89-4680-9789-6a4afc48b5c2/${traceId}`, {
      method: 'GET',
      headers: {
        apikey,
        Authorization: `Bearer ${token}`,
        'x-platform-workspaceid': workspaceId,
        Origin: 'https://in.intellectseecstag.com',
        'Content-Type': 'application/json',
      },
    });

    const data = await trackRes.json().catch(() => ({ status: 'UNKNOWN' }));
    const status = data?.status || (trackRes.ok ? 'COMPLETED' : 'FAILED');
    const isCompleted = status === 'COMPLETED';
    const isFailed = status === 'FAILED' || !!data?.error_response?.length;
    const isDone = isCompleted || isFailed;

    const ticketId =
      data?.response?.output?.[0]?.output?.Ticket_ID ||
      data?.response?.output?.[0]?.beautified_output ||
      null;

    const metrics = data?.response?.output?.[0]?.metrics || null;
    const beautifiedOutput = data?.response?.output?.[0]?.beautified_output || null;

    return res.status(200).json({
      success: trackRes.ok,
      trace_id: traceId,
      status,
      isDone,
      ticketId,
      metrics,
      beautifiedOutput,
      message: data?.message || (isCompleted ? 'Workflow completed successfully' : 'Asset processing'),
      error_response: data?.error_response || null,
      data,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error tracking complaint' });
  }
}
