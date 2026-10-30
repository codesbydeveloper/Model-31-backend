const PROVIDERS = ["Twilio", "Telnyx", "Plivo", "Sinch", "Bandwidth"];

function publicWebhookUrl() {
  return process.env.SMS_PUBLIC_WEBHOOK_URL || "https://model31.raomtech.com/webhook/sms";
}

function canonicalProvider(value) {
  const raw = String(value || "").trim().toLowerCase();
  return PROVIDERS.find((item) => item.toLowerCase() === raw) || "";
}

function basicAuth(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function clip(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 180);
}

async function requestJson(url, { method = "GET", headers = {}, json, form } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...headers,
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: json ? JSON.stringify(json) : form ? new URLSearchParams(form).toString() : undefined,
    signal: AbortSignal.timeout(12000),
  });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: clip(text) };
    }
  }
  return { ok: response.ok, status: response.status, data };
}

function failure(name, result) {
  const data = result.data || {};
  const detail =
    data.message ||
    data.error ||
    (Array.isArray(data.errors) && (data.errors[0]?.detail || data.errors[0]?.title)) ||
    "";
  return {
    webhookRegistered: false,
    webhookUrl: publicWebhookUrl(),
    webhookMessage: clip(detail) || `${name} did not accept the webhook (${result.status}).`,
  };
}

async function registerTwilio(account, url) {
  const auth = basicAuth(account.accountSid, account.authToken);
  const listed = await requestJson(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(account.accountSid)}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(account.phoneNumber)}`,
    { headers: { Authorization: auth } }
  );
  if (!listed.ok) return failure("Twilio", listed);
  const match = listed.data.incoming_phone_numbers?.[0];
  if (!match?.sid) {
    return {
      webhookRegistered: false,
      webhookUrl: url,
      webhookMessage: "That phone number was not found on this Twilio account.",
    };
  }
  const updated = await requestJson(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(account.accountSid)}/IncomingPhoneNumbers/${encodeURIComponent(match.sid)}.json`,
    {
      method: "POST",
      headers: { Authorization: auth },
      form: { SmsUrl: url, SmsMethod: "POST" },
    }
  );
  if (!updated.ok) return failure("Twilio", updated);
  return {
    webhookRegistered: true,
    webhookUrl: url,
    webhookMessage: "Twilio will send new texts to Model 31.",
  };
}

async function registerTelnyx(account, url) {
  const headers = { Authorization: `Bearer ${account.authToken}` };
  let profileId = account.carrierProfileId || "";
  if (!profileId) {
    const listed = await requestJson(
      `https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=${encodeURIComponent(account.phoneNumber)}`,
      { headers }
    );
    if (!listed.ok) return failure("Telnyx", listed);
    const number = listed.data.data?.[0];
    profileId = number?.messaging_profile_id || "";
    if (!profileId && number?.id) {
      const created = await requestJson("https://api.telnyx.com/v2/messaging_profiles", {
        method: "POST",
        headers,
        json: {
          name: "Model 31 SMS",
          webhook_url: url,
          webhook_api_version: "2",
        },
      });
      if (!created.ok) return failure("Telnyx", created);
      profileId = created.data.data?.id || "";
      const assigned = await requestJson(
        `https://api.telnyx.com/v2/phone_numbers/${encodeURIComponent(number.id)}/messaging`,
        {
          method: "PATCH",
          headers,
          json: { messaging_profile_id: profileId },
        }
      );
      if (!assigned.ok) return failure("Telnyx", assigned);
    }
  }
  if (!profileId) {
    return {
      webhookRegistered: false,
      webhookUrl: url,
      webhookMessage: "Telnyx needs a messaging profile on this phone number.",
    };
  }
  const updated = await requestJson(
    `https://api.telnyx.com/v2/messaging_profiles/${encodeURIComponent(profileId)}`,
    {
      method: "PATCH",
      headers,
      json: { webhook_url: url, webhook_api_version: "2" },
    }
  );
  if (!updated.ok) return failure("Telnyx", updated);
  return {
    webhookRegistered: true,
    webhookUrl: url,
    webhookMessage: "Telnyx will send new texts to Model 31.",
  };
}

async function registerPlivo(account, url) {
  const auth = basicAuth(account.accountSid, account.authToken);
  const base = `https://api.plivo.com/v1/Account/${encodeURIComponent(account.accountSid)}`;
  const listed = await requestJson(`${base}/Application/`, { headers: { Authorization: auth } });
  if (!listed.ok) return failure("Plivo", listed);
  const objects = listed.data.objects || [];
  let appId =
    account.carrierProfileId ||
    objects.find((item) => item.app_name === "Model 31 SMS")?.app_id ||
    "";
  if (appId) {
    const updated = await requestJson(`${base}/Application/${encodeURIComponent(appId)}/`, {
      method: "POST",
      headers: { Authorization: auth },
      json: { message_url: url, message_method: "POST" },
    });
    if (!updated.ok) return failure("Plivo", updated);
  } else {
    const created = await requestJson(`${base}/Application/`, {
      method: "POST",
      headers: { Authorization: auth },
      json: {
        app_name: "Model 31 SMS",
        message_url: url,
        message_method: "POST",
      },
    });
    if (!created.ok) return failure("Plivo", created);
    appId = created.data.app_id || "";
  }
  const number = account.phoneNumber.replace(/^\+/, "");
  const linked = await requestJson(`${base}/Number/${encodeURIComponent(number)}/`, {
    method: "POST",
    headers: { Authorization: auth },
    json: { app_id: appId },
  });
  if (!linked.ok) return failure("Plivo", linked);
  return {
    webhookRegistered: true,
    webhookUrl: url,
    webhookMessage: "Plivo will send new texts to Model 31.",
  };
}

function sinchNotice(url) {
  return {
    webhookRegistered: false,
    webhookUrl: url,
    webhookMessage: `In the Sinch dashboard, set this number's inbound callback to ${url}.`,
  };
}

async function registerBandwidth(account, url) {
  if (!account.carrierProfileId) {
    return {
      webhookRegistered: false,
      webhookUrl: url,
      webhookMessage: "Bandwidth needs an application id before the callback can be saved.",
    };
  }
  const auth = basicAuth(account.accountSid, account.authToken);
  const endpoint = `https://api.bandwidth.com/api/accounts/${encodeURIComponent(account.accountSid)}/applications/${encodeURIComponent(account.carrierProfileId)}`;
  const current = await requestJson(endpoint, { headers: { Authorization: auth } });
  if (!current.ok) return failure("Bandwidth", current);
  const updated = await requestJson(endpoint, {
    method: "PUT",
    headers: { Authorization: auth },
    json: {
      ...current.data,
      serviceType: current.data.serviceType || "Messaging-V2",
      inboundCallbackUrl: url,
    },
  });
  if (!updated.ok) return failure("Bandwidth", updated);
  return {
    webhookRegistered: true,
    webhookUrl: url,
    webhookMessage: "Bandwidth will send new texts to Model 31.",
  };
}

async function registerInboundWebhook(account) {
  const url = publicWebhookUrl();
  try {
    if (account.providerType === "Twilio") return await registerTwilio(account, url);
    if (account.providerType === "Telnyx") return await registerTelnyx(account, url);
    if (account.providerType === "Plivo") return await registerPlivo(account, url);
    if (account.providerType === "Sinch") return sinchNotice(url);
    if (account.providerType === "Bandwidth") return await registerBandwidth(account, url);
    return {
      webhookRegistered: false,
      webhookUrl: url,
      webhookMessage: "This text company is not supported.",
    };
  } catch (err) {
    return {
      webhookRegistered: false,
      webhookUrl: url,
      webhookMessage: clip(err.message) || "The text company could not be updated.",
    };
  }
}

async function sendSms(account, { to, body }) {
  const text = String(body || "").trim();
  if (!text) throw new Error("Reply text is empty");

  if (account.providerType === "Twilio") {
    const result = await requestJson(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(account.accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: { Authorization: basicAuth(account.accountSid, account.authToken) },
        form: { From: account.phoneNumber, To: to, Body: text },
      }
    );
    if (!result.ok) throw new Error(failure("Twilio", result).webhookMessage);
    return;
  }

  if (account.providerType === "Telnyx") {
    const result = await requestJson("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${account.authToken}` },
      json: { from: account.phoneNumber, to, text },
    });
    if (!result.ok) throw new Error(failure("Telnyx", result).webhookMessage);
    return;
  }

  if (account.providerType === "Plivo") {
    const result = await requestJson(
      `https://api.plivo.com/v1/Account/${encodeURIComponent(account.accountSid)}/Message/`,
      {
        method: "POST",
        headers: { Authorization: basicAuth(account.accountSid, account.authToken) },
        json: { src: account.phoneNumber, dst: to, text },
      }
    );
    if (!result.ok) throw new Error(failure("Plivo", result).webhookMessage);
    return;
  }

  if (account.providerType === "Sinch") {
    const planId = account.carrierProfileId;
    if (!planId) throw new Error("Sinch needs a service plan id.");
    const region = process.env.SMS_SINCH_REGION || "us";
    const result = await requestJson(
      `https://${encodeURIComponent(region)}.sms.api.sinch.com/xms/v1/${encodeURIComponent(planId)}/batches`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${account.authToken}` },
        json: { from: account.phoneNumber, to: [to], body: text },
      }
    );
    if (!result.ok) throw new Error(failure("Sinch", result).webhookMessage);
    return;
  }

  if (account.providerType === "Bandwidth") {
    if (!account.carrierProfileId) throw new Error("Bandwidth needs an application id.");
    const result = await requestJson(
      `https://messaging.bandwidth.com/api/v2/users/${encodeURIComponent(account.accountSid)}/messages`,
      {
        method: "POST",
        headers: { Authorization: basicAuth(account.accountSid, account.authToken) },
        json: {
          from: account.phoneNumber,
          to: [to],
          text,
          applicationId: account.carrierProfileId,
        },
      }
    );
    if (!result.ok) throw new Error(failure("Bandwidth", result).webhookMessage);
    return;
  }

  throw new Error("This text company is not supported.");
}

module.exports = {
  PROVIDERS,
  canonicalProvider,
  publicWebhookUrl,
  registerInboundWebhook,
  sendSms,
};
