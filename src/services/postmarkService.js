function postmarkConfig() {
  const token = String(process.env.POSTMARK_SERVER_TOKEN || "").trim();
  const from = String(process.env.POSTMARK_FROM || "").trim();
  return { token, from, ready: Boolean(token && from) };
}

async function sendDealSheetEmail({ to, customerName, phone, sheet }) {
  const { token, from, ready } = postmarkConfig();
  if (!ready) {
    console.log("[HERE] Postmark is not in .env yet; skip deal-sheet email.");
    return { sent: false, skipped: true };
  }
  const recipient = String(to || "").trim();
  if (!recipient) {
    console.log("[HERE] Manager email is missing; skip deal-sheet email.");
    return { sent: false, skipped: true };
  }

  const name = String(customerName || "Customer").trim() || "Customer";
  const body = [`VIP ON LOT (${phone || "unknown number"})`, String(sheet || "").trim()]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: from,
        To: recipient,
        Subject: `VIP ON LOT: ${name}`,
        TextBody: body,
        MessageStream: "outbound",
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[HERE] Postmark failed:", data?.Message || data?.ErrorCode || response.status);
      return { sent: false, skipped: false };
    }
    console.log(`[HERE] Deal sheet emailed to ${recipient}.`);
    return { sent: true, skipped: false };
  } catch (err) {
    console.error("[HERE] Postmark failed:", err.message);
    return { sent: false, skipped: false };
  }
}

module.exports = { postmarkConfig, sendDealSheetEmail };
