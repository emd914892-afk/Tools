// /api/tm.js (Node.js Serverless Function for Vercel / Netlify / Node backend)

const MAIL_CX_TOKEN = process.env.MAIL_CX_TOKEN || "tm_live_YOUR_TOKEN_HERE"; // আপনার API টোকেন এখানে দিন বা Environment Variable ব্যবহার করুন
const BASE_URL = "https://api.mail.cx/v1";

export default async function handler(req, res) {
    // CORS Header সেট করা (যাতে GitHub Pages থেকে এক্সেস করা যায়)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action, address, id } = req.query;

    try {
        // ১. ইনবক্সের মেইল তালিকা পেতে (GET /v1/inbox/:address)
        if (action === "getMessages") {
            if (!address) return res.status(400).json({ error: "Address is required" });

            const response = await fetch(`${BASE_URL}/inbox/${address}`, {
                headers: { "x-api-token": MAIL_CX_TOKEN }
            });

            if (response.status === 204) {
                return res.status(200).json({ emails: [] });
            }

            const data = await response.json();
            return res.status(response.status).json(data);
        }

        // ২. নির্দিষ্ট কোনো মেইলের বিস্তারিত পড়তে (GET /v1/email/:id)
        if (action === "readMessage") {
            if (!id) return res.status(400).json({ error: "Email ID is required" });

            const response = await fetch(`${BASE_URL}/email/${id}`, {
                headers: { "x-api-token": MAIL_CX_TOKEN }
            });

            const data = await response.json();
            return res.status(response.status).json(data);
        }

        // ৩. সম্পূর্ণ ইনবক্স ডিলিট করতে (DELETE /v1/inbox/:address)
        if (action === "deleteInbox") {
            if (!address) return res.status(400).json({ error: "Address is required" });

            const response = await fetch(`${BASE_URL}/inbox/${address}`, {
                method: "DELETE",
                headers: { "x-api-token": MAIL_CX_TOKEN }
            });

            return res.status(response.status).json({ success: response.ok });
        }

        return res.status(400).json({ error: "Invalid action requested" });

    } catch (error) {
        console.error("API Proxy Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
