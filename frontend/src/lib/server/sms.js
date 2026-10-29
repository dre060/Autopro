// frontend/src/lib/server/sms.js — text messages via Twilio's REST API.
// Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER (or
// TWILIO_MESSAGING_SERVICE_SID) to enable. US numbers need A2P 10DLC
// registration in Twilio before carriers deliver business texts.

export const isSmsConfigured = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID));

// "(352) 933-5181" -> "+13529335181"
export function toE164(phone) {
  const raw = String(phone || "").trim();
  if (raw.startsWith("+")) return `+${raw.replace(/\D/g, "")}`;
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return d.length > 7 ? `+${d}` : null;
}

export async function sendSms({ to, body }) {
  if (!isSmsConfigured()) return { success: false, error: "SMS is not set up (Twilio)." };
  const dest = toE164(to);
  if (!dest) return { success: false, error: "Invalid phone number" };

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const params = new URLSearchParams({ To: dest, Body: String(body).slice(0, 1500) });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) params.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  else params.set("From", process.env.TWILIO_FROM_NUMBER);

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.message || `Twilio HTTP ${res.status}` };
    return { success: true, id: data.sid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
