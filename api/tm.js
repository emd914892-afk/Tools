export default async function handler(req, res) {
  // CORS Headers set setup
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, user, id } = req.query;
  let targetUrl = '';

  if (action === 'genRandom') {
    targetUrl = 'https://tmpmail.epicz.xyz/api.php?action=genRandom';
  } else if (action === 'getMessages') {
    targetUrl = `https://tmpmail.epicz.xyz/api.php?action=getMessages&user=${encodeURIComponent(user || '')}`;
  } else if (action === 'readMessage') {
    targetUrl = `https://tmpmail.epicz.xyz/api.php?action=readMessage&user=${encodeURIComponent(user || '')}&id=${encodeURIComponent(id || '')}`;
  } else {
    return res.status(400).json({ error: 'Invalid action parameter' });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error Status: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Proxy Fetch Failed', details: err.message });
  }
}
