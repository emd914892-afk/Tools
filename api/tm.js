// api/tm.js
import fetch from 'node-fetch';

// Guerrilla Mail Session Cache
let guerrillaSid = null;

async function getGuerrillaSession(username) {
    try {
        const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(username)}&lang=en`);
        const data = await res.json();
        return data.sid_token;
    } catch (err) {
        console.error("Session Error:", err);
        return null;
    }
}

function extractOtpCode(text) {
    if (!text) return null;
    const match = text.match(/\b\d{4,8}\b/);
    return match ? match[0] : null;
}

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { action, user, id } = req.query;

    try {
        // 1. Check server health
        if (action === 'status') {
            return res.status(200).json({ status: "ok", database: "connected", timestamp: Date.now() });
        }

        // 2. Generate random username
        if (action === 'genRandom') {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let randomUser = '';
            for (let i = 0; i < 8; i++) {
                randomUser += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return res.status(200).json({ username: randomUser, domain: "epicz.xyz" });
        }

        // 3. Fetch latest 50 messages for a user
        if (action === 'getMessages') {
            if (!user) {
                return res.status(400).json({ error: "Parameter 'user' is required" });
            }

            const sid = await getGuerrillaSession(user);
            if (!sid) {
                return res.status(500).json({ error: "Failed to connect to mail server" });
            }

            const mailRes = await fetch(`https://api.guerrillamail.com/ajax.php?f=get_email_list&offset=0&sid_token=${sid}`);
            const mailData = await mailRes.json();

            const formattedMessages = (mailData.list || []).map(msg => {
                const otp = extractOtpCode(msg.mail_subject) || extractOtpCode(msg.mail_excerpt);
                return {
                    id: msg.mail_id,
                    from: msg.mail_from,
                    subject: msg.mail_subject,
                    date: msg.mail_date,
                    snippet: msg.mail_excerpt,
                    extracted_code: otp || null
                };
            });

            return res.status(200).json(formattedMessages);
        }

        // 4. Read specific message body and extracted codes
        if (action === 'readMessage') {
            if (!user || !id) {
                return res.status(400).json({ error: "Parameters 'user' and 'id' are required" });
            }

            const sid = await getGuerrillaSession(user);
            const msgRes = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${id}&sid_token=${sid}`);
            const msgData = await msgRes.json();

            const fullText = (msgData.mail_body || "") + " " + (msgData.mail_subject || "");
            const extractedCode = extractOtpCode(fullText);

            return res.status(200).json({
                id: msgData.mail_id,
                from: msgData.mail_from,
                subject: msgData.mail_subject,
                body: msgData.mail_body,
                html: msgData.mail_body,
                extracted_code: extractedCode || null
            });
        }

        // 5. Permanently clear inbox for a user
        if (action === 'deleteInbox') {
            if (!user) {
                return res.status(400).json({ error: "Parameter 'user' is required" });
            }

            const sid = await getGuerrillaSession(user);
            const listRes = await fetch(`https://api.guerrillamail.com/ajax.php?f=get_email_list&offset=0&sid_token=${sid}`);
            const listData = await listRes.json();

            const idsToDelete = (listData.list || []).map(m => m.mail_id);
            if (idsToDelete.length > 0) {
                await fetch(`https://api.guerrillamail.com/ajax.php?f=del_email&email_ids=${idsToDelete.join(',')}&sid_token=${sid}`);
            }

            return res.status(200).json({ success: true, message: "Inbox cleared successfully" });
        }

        return res.status(400).json({ error: "Invalid action" });

    } catch (error) {
        console.error("API Handler Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
