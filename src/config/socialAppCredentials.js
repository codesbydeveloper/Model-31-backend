const PLATFORM_APPS = {
  Facebook: {
    helpUrl: "https://developers.facebook.com",
    publicKeys: { appId: "META_APP_ID" },
    secretKeys: { appSecret: "META_APP_SECRET" },
  },
  Instagram: {
    helpUrl: "https://developers.facebook.com",
    publicKeys: { appId: "META_APP_ID" },
    secretKeys: { appSecret: "META_APP_SECRET" },
  },
  WhatsApp: {
    helpUrl: "https://developers.facebook.com",
    publicKeys: { appId: "META_APP_ID" },
    secretKeys: { appSecret: "META_APP_SECRET" },
  },
  TikTok: {
    helpUrl: "https://developers.tiktok.com",
    publicKeys: { clientKey: "TIKTOK_CLIENT_KEY" },
    secretKeys: { clientSecret: "TIKTOK_CLIENT_SECRET" },
  },
  YouTube: {
    helpUrl: "https://console.cloud.google.com",
    publicKeys: { clientId: "GOOGLE_CLIENT_ID" },
    secretKeys: { clientSecret: "GOOGLE_CLIENT_SECRET" },
  },
  X: {
    helpUrl: "https://developer.x.com",
    publicKeys: { clientId: "X_CLIENT_ID" },
    secretKeys: { clientSecret: "X_CLIENT_SECRET" },
  },
  Whatnot: {
    helpUrl: "",
    publicKeys: { clientId: "WHATNOT_CLIENT_ID" },
    secretKeys: { clientSecret: "WHATNOT_CLIENT_SECRET" },
  },
};

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function getSocialAppCredentials(platform) {
  const name = String(platform || "").trim();
  const spec = PLATFORM_APPS[name];
  if (!spec) {
    return {
      platform: name,
      configured: false,
      missing: [],
      helpUrl: "",
      publicCreds: {},
    };
  }

  const missing = [];
  const publicCreds = {};
  for (const [field, envName] of Object.entries(spec.publicKeys)) {
    const value = readEnv(envName);
    if (!value) missing.push(envName);
    else publicCreds[field] = value;
  }
  for (const envName of Object.values(spec.secretKeys)) {
    if (!readEnv(envName)) missing.push(envName);
  }

  return {
    platform: name,
    configured: missing.length === 0,
    missing,
    helpUrl: spec.helpUrl,
    publicCreds,
  };
}

module.exports = {
  getSocialAppCredentials,
};
