export default async function handler(req, res) {
  // CORS Permissions
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Only POST request allowed' });
  }

  try {
    const { full_data, mail_type } = req.body || {};
    if (!full_data) {
      return res.status(400).json({ status: 'error', message: '❌ ডাটা ফাঁকা হতে পারে না!' });
    }

    const parts = full_data.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length < 3) {
      return res.status(400).json({ status: 'error', message: '❌ ভুল ইনপুট ফরম্যাট! কমপক্ষে email|pass|refresh_token দিন।' });
    }

    const refreshToken = parts[2];
    let parsedMails = [];

    // MICROSOFT GRAPH MAIL
    if (mail_type === 'graph') {
      const clientId = parts[3] || '1f16d111-b58a-4933-b269-e705bfda6044';
      
      const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          scope: 'https://graph.microsoft.com/Mail.Read offline_access'
        })
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return res.status(400).json({ status: 'error', message: `❌ মাইক্রোসফট টোকেন এরর: ${tokenData.error_description || 'ইনভ্যালিড রিফ্রেশ টোকেন'}` });
      }

      const mailRes = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=5', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const mailData = await mailRes.json();

      if (mailData.value) {
        parsedMails = mailData.value.map(mail => ({
          sender: mail.from?.emailAddress?.address || 'Unknown Sender',
          subject: mail.subject || 'No Subject',
          body: mail.bodyPreview || 'No Preview available...',
          date: (mail.receivedDateTime || '').slice(0, 10)
        }));
      }

    // GMAIL
    } else if (mail_type === 'gmail') {
      const googleClientId = parts[3];
      const googleClientSecret = parts[4];

      if (!googleClientId || !googleClientSecret) {
        return res.status(400).json({ status: 'error', message: '❌ জিমেইলের ক্ষেত্রে client_id ও client_secret দিতে হবে!' });
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return res.status(400).json({ status: 'error', message: `❌ গুগল টোকেন এরর: ${tokenData.error_description || 'রিফ্রেশ টোকেন রিজেক্টেড'}` });
      }

      const listRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const listData = await listRes.json();

      if (listData.messages) {
        for (const msg of listData.messages) {
          const detailRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
          });
          const detail = await detailRes.json();
          
          let subject = 'No Subject', sender = 'Unknown Sender';
          const headers = detail.payload?.headers || [];
          headers.forEach(h => {
            if (h.name === 'Subject') subject = h.value;
            if (h.name === 'From') sender = h.value;
          });

          parsedMails.push({
            sender,
            subject,
            body: detail.snippet || 'No preview available...',
            date: 'Gmail'
          });
        }
      }
    }

    if (parsedMails.length > 0) {
      const firstText = `${parsedMails[0].subject} ${parsedMails[0].body}`;
      const extractedCode = extractOtpJs(firstText);
      return res.status(200).json({ status: 'success', latest_code: extractedCode, mails: parsedMails });
    } else {
      return res.status(400).json({ status: 'error', message: '❌ ইনবক্সে কোনো নতুন ইমেইল পাওয়া যায়নি!' });
    }

  } catch (err) {
    return res.status(500).json({ status: 'error', message: `❌ সার্ভার এরর: ${err.message}` });
  }
}

function extractOtpJs(text) {
  const match = text.match(/(?:code|otp|verification|verify)[^\d]*(\b\d{4,8}\b)/i);
  if (match) return match[1];
  const all = text.match(/\b\d{4,8}\b/g);
  if (all) {
    for (const n of all) {
      if (!['2024', '2025', '2026'].includes(n)) return n;
    }
  }
  return '-----';
}
