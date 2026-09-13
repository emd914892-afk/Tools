export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, user, id } = req.query;
  const BASE_EPICZ = "https://tmpmail.epicz.xyz/api.php";

  try {
    // 1. Random User Generator
    if (action === 'genRandom') {
      const response = await fetch(`${BASE_EPICZ}?action=genRandom`);
      const data = await response.json();
      return res.status(200).json(data);
    }

    // 2. Fetch Messages List
    if (action === 'getMessages') {
      if (!user) return res.status(400).json({ error: 'User parameter required' });
      const response = await fetch(`${BASE_EPICZ}?action=getMessages&user=${encodeURIComponent(user)}`);
      const data = await response.json();
      return res.status(200).json(data);
    }

    // 3. Read Single Message Body
    if (action === 'readMessage') {
      if (!user || !id) return res.status(400).json({ error: 'User and Message ID required' });
      const response = await fetch(`${BASE_EPICZ}?action=readMessage&user=${encodeURIComponent(user)}&id=${encodeURIComponent(id)}`);
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid action parameter' });

  } catch (err) {
    return res.status(500).json({ error: 'Server Connection Error', details: err.message });
  }
}
