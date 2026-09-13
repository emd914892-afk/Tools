export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, user, id } = req.query;
  const targetUrl = action === 'genRandom' 
    ? 'https://tmpmail.epicz.xyz/api.php?action=genRandom'
    : action === 'getMessages' 
    ? `https://tmpmail.epicz.xyz/api.php?action=getMessages&user=${user}`
    : `https://tmpmail.epicz.xyz/api.php?action=readMessage&user=${user}&id=${id}`;

  try {
    const response = await fetch(targetUrl);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Epicz Server Failed', message: err.message });
  }
}
