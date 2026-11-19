const pool = require("../config/database");
const AppError = require("../utils/AppError");
const { encryptToken, decryptToken } = require("../utils/tokenCrypto");
const { normalizePhone } = require("../utils/smsPhone");
const {
  PROVIDERS,
  canonicalProvider,
  publicWebhookUrl,
  registerInboundWebhook,
  sendSms,
} = require("./smsCarrierService");

const ALERT_CELL_LABEL = "Cell phone for buyer arrival alerts";
const ALERT_EMAIL_LABEL = "Manager email for deal sheets";
const CONNECT_TEST_TEXT = "Model 31 is connected. You'll get lot-arrival alerts here.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function smsStatusOf(row) {
  if (!row?.sms_provider || !row?.sms_phone_number) return null;
  return String(row.sms_status || "CONNECTED").toUpperCase() === "DISCONNECTED"
    ? "DISCONNECTED"
    : "CONNECTED";
}

function publicAccount(row, extra = {}) {
  const status = smsStatusOf(row);
  const connected = status === "CONNECTED";
  return {
    providerType: row.sms_provider,
    accountSid: row.sms_account_sid || "",
    phoneNumber: row.sms_phone_number || "",
    managerMobile: row.sms_manager_mobile || "",
    managerMobileLabel: ALERT_CELL_LABEL,
    managerEmail: row.sms_manager_email || "",
    managerEmailLabel: ALERT_EMAIL_LABEL,
    timezone: row.timezone || "America/New_York",
    carrierProfileId: row.sms_profile_id || null,
    hasAuthToken: Boolean(row.sms_auth_token),
    status,
    connected,
    lastUpdated: row.updated_at || null,
    canConnect: status === "DISCONNECTED",
    canDisconnect: connected,
    canEdit: true,
    canDelete: true,
    ...extra,
  };
}

async function loadRow(dealershipId) {
  const [rows] = await pool.query(
    `SELECT id, name, timezone, sms_provider, sms_account_sid, sms_auth_token,
            sms_phone_number, sms_manager_mobile, sms_manager_email, sms_profile_id, sms_status, updated_at
     FROM dealerships
     WHERE id = ?
     LIMIT 1`,
    [dealershipId]
  );
  return rows[0] || null;
}

function readManagerMobile(body, current) {
  const raw =
    body.managerMobile !== undefined
      ? body.managerMobile
      : body.managerPhone !== undefined
        ? body.managerPhone
        : body.alertPhone !== undefined
          ? body.alertPhone
          : body.cellPhone;
  if (raw === undefined) return current?.sms_manager_mobile || "";
  return normalizePhone(raw);
}

function requireManagerMobile(phone, dealershipPhone) {
  if (!phone) {
    throw new AppError(`${ALERT_CELL_LABEL} is required`, 400);
  }
  if (dealershipPhone && phone === dealershipPhone) {
    throw new AppError(
      `${ALERT_CELL_LABEL} must be a personal cell, not the dealership phone`,
      400
    );
  }
  return phone;
}

function readManagerEmail(body, current) {
  const raw = body.managerEmail !== undefined ? body.managerEmail : body.email;
  if (raw === undefined) return String(current?.sms_manager_email || "").trim();
  return String(raw || "").trim();
}

function requireManagerEmail(email) {
  if (!email) {
    throw new AppError(`${ALERT_EMAIL_LABEL} is required`, 400);
  }
  if (email.length > 191 || !EMAIL_PATTERN.test(email)) {
    throw new AppError("Manager email must be a valid email address", 400);
  }
  return email;
}

async function sendConnectTest(row, plainToken) {
  const to = row.sms_manager_mobile;
  if (!to) return { alertSent: false, alertMessage: `${ALERT_CELL_LABEL} is required` };
  let authToken = plainToken || "";
  if (!authToken) {
    try {
      authToken = decryptToken(row.sms_auth_token);
    } catch (err) {
      return { alertSent: false, alertMessage: err.message || "Saved SMS secret could not be read" };
    }
  }
  if (!authToken) {
    return { alertSent: false, alertMessage: "Secret key is required to send the test text" };
  }
  try {
    await sendSms(
      {
        providerType: row.sms_provider,
        accountSid: row.sms_account_sid,
        authToken,
        phoneNumber: row.sms_phone_number,
        carrierProfileId: row.sms_profile_id || null,
      },
      { to, body: CONNECT_TEST_TEXT }
    );
    console.log(`[SMS] ${row.name}: connect test sent to ${to}.`);
    return { alertSent: true, alertMessage: `Test text sent to ${to}.` };
  } catch (err) {
    console.error(`[SMS] ${row.name}: connect test failed:`, err.message);
    return { alertSent: false, alertMessage: err.message || "The test text could not be sent" };
  }
}

async function getSmsAccount(dealershipId) {
  const row = await loadRow(dealershipId);
  if (!row) throw new AppError("Dealership not found", 404);
  if (!row.sms_provider || !row.sms_phone_number) {
    return {
      connected: false,
      managerMobile: row.sms_manager_mobile || "",
      managerMobileLabel: ALERT_CELL_LABEL,
      managerEmail: row.sms_manager_email || "",
      managerEmailLabel: ALERT_EMAIL_LABEL,
    };
  }
  return publicAccount(row);
}

async function saveSmsAccount(dealershipId, body) {
  const current = await loadRow(dealershipId);
  if (!current) throw new AppError("Dealership not found", 404);

  const providerType = canonicalProvider(body.providerType);
  if (!providerType) {
    throw new AppError(`providerType must be one of: ${PROVIDERS.join(", ")}`, 400);
  }

  const accountSid = String(body.accountSid || "").trim();
  if (!accountSid) throw new AppError("Account key is required", 400);
  if (accountSid.length > 255) throw new AppError("Account key is too long", 400);

  const phoneNumber = normalizePhone(body.phoneNumber);
  if (!phoneNumber) {
    throw new AppError("Phone number must be a valid number, like +13051112222", 400);
  }

  const managerMobile = requireManagerMobile(readManagerMobile(body, current), phoneNumber);
  const managerEmail = requireManagerEmail(readManagerEmail(body, current));

  const timezone = String(body.timezone || "").trim();
  if (!timezone) throw new AppError("Timezone is required", 400);
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new AppError("Timezone is not valid", 400);
  }

  const profileRaw = body.carrierProfileId;
  const carrierProfileId =
    profileRaw === undefined || profileRaw === null || String(profileRaw).trim() === ""
      ? null
      : String(profileRaw).trim();
  if (carrierProfileId && carrierProfileId.length > 255) {
    throw new AppError("Profile ID is too long", 400);
  }
  if ((providerType === "Sinch" || providerType === "Bandwidth") && !carrierProfileId) {
    throw new AppError("Profile ID is required for Sinch and Bandwidth", 400);
  }

  const tokenSent = body.authToken !== undefined && body.authToken !== null && String(body.authToken).trim() !== "";
  let encryptedToken = null;
  if (tokenSent) {
    encryptedToken = encryptToken(String(body.authToken).trim());
  } else if (!current.sms_auth_token) {
    throw new AppError("Secret key is required", 400);
  }

  const [taken] = await pool.query(
    `SELECT id FROM dealerships WHERE sms_phone_number = ? AND id <> ? LIMIT 1`,
    [phoneNumber, dealershipId]
  );
  if (taken.length) {
    throw new AppError("That phone number is already used by another dealership", 409);
  }

  await pool.query(
    `UPDATE dealerships
     SET sms_provider = ?,
         sms_account_sid = ?,
         sms_auth_token = COALESCE(?, sms_auth_token),
         sms_phone_number = ?,
         sms_manager_mobile = ?,
         sms_manager_email = ?,
         sms_profile_id = ?,
         sms_status = 'CONNECTED',
         timezone = ?
     WHERE id = ?`,
    [
      providerType,
      accountSid,
      encryptedToken,
      phoneNumber,
      managerMobile,
      managerEmail,
      carrierProfileId,
      timezone,
      dealershipId,
    ]
  );

  const saved = await loadRow(dealershipId);
  const plainToken = tokenSent ? String(body.authToken).trim() : null;
  let webhook = {
    webhookRegistered: false,
    webhookUrl: publicWebhookUrl(),
    webhookMessage: "Secret key is unchanged, so the text company was not updated.",
  };
  if (plainToken) {
    webhook = await registerInboundWebhook({
      providerType,
      accountSid,
      authToken: plainToken,
      phoneNumber,
      carrierProfileId,
    });
    console.log(
      `[SMS] ${saved.name}: webhook ${webhook.webhookRegistered ? "registered" : "not registered"}. ${webhook.webhookMessage}`
    );
  }

  const alert = await sendConnectTest(saved, plainToken);

  return publicAccount(saved, { ...webhook, ...alert });
}

function assertSavedAccount(row) {
  if (!row) throw new AppError("Dealership not found", 404);
  if (!row.sms_provider || !row.sms_phone_number) {
    throw new AppError("No text account is saved", 404);
  }
  return row;
}

async function disconnectSmsAccount(dealershipId) {
  const row = assertSavedAccount(await loadRow(dealershipId));
  if (smsStatusOf(row) === "DISCONNECTED") {
    throw new AppError("Text account is already disconnected", 400);
  }
  await pool.query(
    `UPDATE dealerships SET sms_status = 'DISCONNECTED' WHERE id = ?`,
    [dealershipId]
  );
  return publicAccount(await loadRow(dealershipId), {
    message: "Text account disconnected. Keys are saved. Connect again to resume texts.",
  });
}

async function connectSmsAccount(dealershipId) {
  const row = assertSavedAccount(await loadRow(dealershipId));
  if (smsStatusOf(row) === "CONNECTED") {
    throw new AppError("Text account is already connected", 400);
  }
  requireManagerMobile(row.sms_manager_mobile || "", row.sms_phone_number);
  requireManagerEmail(row.sms_manager_email || "");
  await pool.query(
    `UPDATE dealerships SET sms_status = 'CONNECTED' WHERE id = ?`,
    [dealershipId]
  );
  const saved = await loadRow(dealershipId);
  const alert = await sendConnectTest(saved);
  return publicAccount(saved, {
    message: "Text account connected.",
    ...alert,
  });
}

async function deleteSmsAccount(dealershipId) {
  assertSavedAccount(await loadRow(dealershipId));
  await pool.query(
    `UPDATE dealerships
     SET sms_provider = NULL,
         sms_account_sid = NULL,
         sms_auth_token = NULL,
         sms_phone_number = NULL,
         sms_manager_mobile = NULL,
         sms_manager_email = NULL,
         sms_profile_id = NULL,
         sms_status = NULL
     WHERE id = ?`,
    [dealershipId]
  );
  return {
    connected: false,
    message: "Text account deleted.",
  };
}

module.exports = {
  getSmsAccount,
  saveSmsAccount,
  disconnectSmsAccount,
  connectSmsAccount,
  deleteSmsAccount,
  loadRow,
};
