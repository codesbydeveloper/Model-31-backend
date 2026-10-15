const pool = require("../config/database");
const AppError = require("../utils/AppError");

function graphVersion() {
  const version = String(process.env.META_GRAPH_VERSION || "v23.0").trim();
  return version.startsWith("v") ? version : `v${version}`;
}

function pageConfig() {
  const pageId = String(process.env.META_PAGE_ID || "").trim();
  const pageAccessToken = String(process.env.META_PAGE_ACCESS_TOKEN || "").trim();
  const missing = [];
  if (!pageId) missing.push("META_PAGE_ID");
  if (!pageAccessToken) missing.push("META_PAGE_ACCESS_TOKEN");
  return { pageId, pageAccessToken, missing };
}

async function graphRequest(method, path, params = {}) {
  const url = new URL(`https://graph.facebook.com/${graphVersion()}/${path}`);
  const options = { method };
  if (method === "GET") {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  } else {
    options.headers = { "Content-Type": "application/x-www-form-urlencoded" };
    options.body = new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([key, value]) => [key, String(value)])
    );
  }
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    throw new AppError(body.error?.message || "Facebook could not read this Page", 400);
  }
  return body;
}

async function graphGet(path, params = {}) {
  return graphRequest("GET", path, params);
}

async function loadLinkedPage() {
  const config = pageConfig();
  if (config.missing.length) {
    throw new AppError(
      `Facebook Page is not configured. Add ${config.missing.join(", ")} to the server environment.`,
      400
    );
  }

  const page = await graphGet(config.pageId, {
    fields: "id,name",
    access_token: config.pageAccessToken,
  });

  let followers = 0;
  let instagramId = null;
  let instagramUsername = null;
  try {
    const details = await graphGet(config.pageId, {
      fields: "fan_count,followers_count,instagram_business_account{id,username}",
      access_token: config.pageAccessToken,
    });
    followers = Number(details.followers_count || details.fan_count) || 0;
    instagramId = details.instagram_business_account?.id || null;
    instagramUsername = details.instagram_business_account?.username || null;
  } catch (err) {
    followers = 0;
  }

  let posts = 0;
  try {
    const feed = await graphGet(`${config.pageId}/posts`, {
      fields: "id",
      limit: "25",
      access_token: config.pageAccessToken,
    });
    posts = (feed.data || []).length;
  } catch (err) {
    posts = 0;
  }

  let subscribed = false;
  try {
    await graphRequest("POST", `${config.pageId}/subscribed_apps`, {
      subscribed_fields: "feed,messages,messaging_postbacks",
      access_token: config.pageAccessToken,
    });
    subscribed = true;
  } catch (err) {
    subscribed = false;
  }

  return {
    pageId: page.id,
    pageName: page.name,
    followers,
    posts,
    instagramId,
    instagramUsername,
    pageAccessToken: config.pageAccessToken,
    webhookSubscribed: subscribed,
  };
}

async function saveCredentials(accountId, credentials) {
  await pool.query(
    `INSERT INTO social_account_credentials (account_id, credentials_json)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE credentials_json = VALUES(credentials_json), updated_at = CURRENT_TIMESTAMP`,
    [accountId, JSON.stringify(credentials)]
  );
}

async function connectConfiguredPage(account) {
  const SocialAccount = require("../models/SocialAccount");
  if (account.platform !== "Facebook" && account.platform !== "Instagram") {
    return null;
  }

  const page = await loadLinkedPage();
  const stored = {
    source: "env_page",
    pageId: page.pageId,
    pageName: page.pageName,
    instagramBusinessAccountId: page.instagramId,
    instagramUsername: page.instagramUsername,
  };

  if (account.platform === "Instagram" && !page.instagramId) {
    throw new AppError(
      "This Facebook Page has no Instagram professional account linked to it.",
      400
    );
  }

  const accounts = await SocialAccount.listByDealership(account.dealershipId);
  const facebook = accounts.find((item) => item.platform === "Facebook");
  const instagram = accounts.find((item) => item.platform === "Instagram");

  if (facebook) {
    await saveCredentials(facebook.id, stored);
    await SocialAccount.connect(facebook.id, {
      accountName: page.pageName,
      ownerName: page.pageName,
      environment: "Production",
    });
    await SocialAccount.updateStats(facebook.id, {
      posts: page.posts,
      followers: page.followers,
    });
  }

  if (instagram && page.instagramId) {
    await saveCredentials(instagram.id, stored);
    await SocialAccount.connect(instagram.id, {
      accountName: page.instagramUsername || page.pageName,
      ownerName: page.instagramUsername || page.pageName,
      environment: "Production",
    });
    await SocialAccount.updateStats(instagram.id, {
      posts: page.posts,
      followers: page.followers,
    });
  }

  const refreshed = await SocialAccount.findById(account.id);
  return {
    message: `${account.platform} connected`,
    pageLinked: true,
    pageId: page.pageId,
    pageName: page.pageName,
    instagramUsername: page.instagramUsername,
    webhookSubscribed: page.webhookSubscribed,
    account: SocialAccount.mapCard(refreshed),
    usesServerCredentials: true,
  };
}

function verifyWebhook(query = {}) {
  const mode = query["hub.mode"] || query.hub?.mode;
  const token = query["hub.verify_token"] || query.hub?.verify_token;
  const challenge = query["hub.challenge"] || query.hub?.challenge;
  const expected = String(process.env.META_VERIFY_TOKEN || "").trim();
  if (mode === "subscribe" && token && token === expected && challenge) {
    return String(challenge);
  }
  return null;
}

module.exports = {
  connectConfiguredPage,
  verifyWebhook,
};
