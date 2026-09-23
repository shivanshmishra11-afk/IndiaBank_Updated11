export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-platform-workspaceid');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apikey = process.env.INTELLECT_API_KEY || '';
  const workspaceId = process.env.INTELLECT_WORKSPACE_ID || '';
  const username = process.env.INTELLECT_USERNAME || '';
  const password = process.env.INTELLECT_PASSWORD || '';

  try {
    const tokenRes = await fetch('https://api.in.intellectseecstag.com/accesstoken/pfpreview', {
      method: 'GET',
      headers: {
        apikey,
        username,
        password,
      },
    });

    const tokenData = await tokenRes.json().catch(() => ({ error: 'Invalid JSON response' }));
    return res.status(200).json({
      status: tokenRes.status,
      ok: tokenRes.ok,
      data: tokenData,
      workspaceId,
      endpoint: 'https://api.in.intellectseecstag.com/accesstoken/pfpreview',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to connect to gateway' });
  }
}
