const { google } = require("googleapis");
const pool = require("../config/database");

const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

function youtubeClient() {
  const oauth2 = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  return google.youtube({ version: "v3", auth: oauth2 });
}

async function inventoryLines() {
  try {
    const [rows] = await pool.query(
      `SELECT year, make, model, vehicle, price
       FROM merchandising_vehicles
       ORDER BY updated_at DESC
       LIMIT 30`
    );
    if (!rows.length) return "No vehicles are in inventory.";
    return rows
      .map((row) => {
        const name = row.vehicle || [row.year, row.make, row.model].filter(Boolean).join(" ");
        const price = Number(row.price) > 0 ? `$${Number(row.price)}` : "price not listed";
        return `- ${name} — ${price}`;
      })
      .join("\n");
  } catch (err) {
    console.error("YouTube inventory read failed:", err.message);
    return "Inventory could not be loaded.";
  }
}

async function askAI(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const inventory = await inventoryLines();
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are the assistant for Model 31, a vehicle dealer, replying to a YouTube comment. " +
              "Reply in 1-2 short, friendly sentences. Never ask for a phone number in public. " +
              "If they are interested in buying, invite them to message Model 31 on Facebook or Instagram. " +
              "Use only the inventory list. If they ask for a vehicle that is not on the list, say it is not available. " +
              "Do not invent vehicles or prices.",
          },
          {
            role: "user",
            content: `Inventory:\n${inventory}\n\nYouTube comment: ${text}`,
          },
        ],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("YouTube OpenAI error:", data?.error?.message || response.status);
      return null;
    }
    return String(data.choices?.[0]?.message?.content || "").trim() || null;
  } catch (err) {
    console.error("YouTube OpenAI error:", err.message);
    return null;
  }
}

async function alreadyReplied(commentId) {
  const [rows] = await pool.query(
    "SELECT comment_id FROM youtube_replied_comments WHERE comment_id = ?",
    [commentId]
  );
  return rows.length > 0;
}

async function markReplied(commentId) {
  await pool.query(
    "INSERT IGNORE INTO youtube_replied_comments (comment_id) VALUES (?)",
    [commentId]
  );
}

async function checkYouTubeComments() {
  if (!process.env.YOUTUBE_REFRESH_TOKEN || !CHANNEL_ID) return;
  try {
    const youtube = youtubeClient();
    const { data } = await youtube.commentThreads.list({
      part: ["snippet"],
      allThreadsRelatedToChannelId: CHANNEL_ID,
      maxResults: 50,
      order: "time",
    });

    for (const thread of data.items || []) {
      const topComment = thread.snippet?.topLevelComment;
      const top = topComment?.snippet;
      const commentId = topComment?.id;
      if (!top || !commentId) continue;
      if (top.authorChannelId?.value === CHANNEL_ID) continue;
      if (await alreadyReplied(commentId)) continue;

      console.log("YouTube comment:", top.authorDisplayName, "-", top.textOriginal);
      const reply = await askAI(top.textOriginal);
      if (!reply) continue;

      await youtube.comments.insert({
        part: ["snippet"],
        requestBody: {
          snippet: { parentId: commentId, textOriginal: reply },
        },
      });
      await markReplied(commentId);
      console.log("YouTube reply sent");
    }
  } catch (err) {
    console.error("YouTube error:", err.response?.data?.error || err.message);
  }
}

async function getChannelStats() {
  const youtube = youtubeClient();
  const { data } = await youtube.channels.list({
    part: ["snippet", "statistics"],
    id: [CHANNEL_ID],
  });
  const channel = data.items?.[0];
  return {
    name: channel?.snippet?.title,
    subscribers: Number(channel?.statistics?.subscriberCount || 0),
    views: Number(channel?.statistics?.viewCount || 0),
    videos: Number(channel?.statistics?.videoCount || 0),
  };
}

module.exports = { checkYouTubeComments, getChannelStats };
