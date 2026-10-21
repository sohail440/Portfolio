const ALLOWED_SERVICES = new Set([
  "Website Development", "WordPress & Elementor", "WooCommerce / E-commerce Store",
  "Landing Page Design", "Responsive Web Design", "Website Customization",
  "Bug Fixes & Troubleshooting", "Website Speed Optimization",
  "Front-End Development (HTML/CSS)", "Other / Custom Requirements",
]);
function clean(value, max) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
}
function json(res, status, body) { return res.status(status).setHeader("Content-Type", "application/json; charset=utf-8").json(body); }

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return json(res, 405, { error: "Method not allowed." }); }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL || "sohailwork343@gmail.com";
  if (!apiKey || !from) {
    console.error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL.");
    return json(res, 503, { error: "Email service is not configured yet. Please email sohailwork343@gmail.com directly." });
  }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { return json(res, 400, { error: "Invalid request." }); } }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json(res, 400, { error: "Invalid request." });

  const name = clean(body.name, 100), email = clean(body.email, 254);
  const project = clean(body.project, 100), message = clean(body.message, 5000);
  if (!name || !email || !project || !message) return json(res, 400, { error: "Please complete every field." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: "Please enter a valid email address." });
  if (!ALLOWED_SERVICES.has(project)) return json(res, 400, { error: "Please select a valid service." });

  const safeName = escapeHtml(name), safeEmail = escapeHtml(email);
  const safeProject = escapeHtml(project), safeMessage = escapeHtml(message);
  const replySubject = encodeURIComponent(`Re: New Portfolio Inquiry: ${project}`);
  const html = `
  <div style="margin:0;background:#f3f4f6;padding:32px 14px;font-family:Arial,Helvetica,sans-serif;color:#f5f7fb">
    <div style="max-width:640px;margin:0 auto;border:1px solid #26213b;border-radius:20px;overflow:hidden;background:#0d1015">
      <div style="padding:28px 30px;background:linear-gradient(120deg,#171027,#10242b);border-bottom:1px solid #29223d">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#22d3ee;font-weight:700">Portfolio Contact</div>
        <h1 style="margin:12px 0 8px;font-size:25px;line-height:1.3;color:#fff">New project inquiry</h1>
        <p style="margin:0;color:#b9c2d0;font-size:14px;line-height:1.6">Someone has sent a message through Sohail Ahmed’s portfolio.</p>
      </div>
      <div style="padding:28px 30px">
        <div style="margin-bottom:18px;padding:16px;border:1px solid #2b2440;border-radius:13px;background:#12111c">
          <div style="margin-bottom:7px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#a78bfa">Service requested</div>
          <div style="font-size:16px;font-weight:700;color:#22d3ee">${safeProject}</div>
        </div>
        <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:22px">
          <tr><td style="padding:12px 0;border-bottom:1px solid #252a34;color:#8993a4;width:100px;font-size:13px">Name</td><td style="padding:12px 0;border-bottom:1px solid #252a34;color:#f5f7fb;font-size:14px;font-weight:600">${safeName}</td></tr>
          <tr><td style="padding:12px 0;border-bottom:1px solid #252a34;color:#8993a4;font-size:13px">Email</td><td style="padding:12px 0;border-bottom:1px solid #252a34;font-size:14px"><a href="mailto:${safeEmail}" style="color:#22d3ee;text-decoration:none">${safeEmail}</a></td></tr>
        </table>
        <div style="margin-bottom:9px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#a78bfa">Project message</div>
        <div style="padding:18px;border:1px solid #252a34;border-radius:13px;background:#090c11;color:#e4e8ef;font-size:14px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere">${safeMessage}</div>
        <div style="margin-top:24px"><a href="mailto:${safeEmail}?subject=${replySubject}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#8b5cf6;color:#fff;text-decoration:none;font-size:13px;font-weight:700">Reply to ${safeName}</a></div>
      </div>
      <div style="padding:17px 30px;border-top:1px solid #252a34;color:#7f8999;font-size:11px;line-height:1.6">Sent securely from sohails-portfolio.vercel.app · Sohail Ahmed, Senior Web Developer</div>
    </div>
  </div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [to], reply_to: email, subject: `New Portfolio Inquiry: ${project}`, html,
        text: `New project inquiry\n\nName: ${name}\nEmail: ${email}\nService: ${project}\n\nMessage:\n${message}`,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend API error:", response.status, detail.slice(0, 500));
      return json(res, 502, { error: "Email could not be sent right now. Please try again or email Sohail directly." });
    }
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error("Contact email request failed:", error);
    return json(res, 502, { error: "Email service is temporarily unavailable. Please try again later." });
  }
};
