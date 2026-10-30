require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const pool = require("./src/config/database");
const authRoutes = require("./src/routes/authRoutes");
const dealershipRoutes = require("./src/routes/dealershipRoutes");
const leadRoutes = require("./src/routes/leadRoutes");
const cityRoutes = require("./src/routes/cityRoutes");
const buyerPersonaRoutes = require("./src/routes/buyerPersonaRoutes");
const scoringRulesRoutes = require("./src/routes/scoringRulesRoutes");
const aiConfigurationRoutes = require("./src/routes/aiConfigurationRoutes");
const userRoutes = require("./src/routes/userRoutes");
const negotiationTemplateRoutes = require("./src/routes/negotiationTemplateRoutes");
const dealershipPortalRoutes = require("./src/routes/dealershipPortalRoutes");
const bdcPortalRoutes = require("./src/routes/bdcPortalRoutes");
const salespersonPortalRoutes = require("./src/routes/salespersonPortalRoutes");
const marketingPortalRoutes = require("./src/routes/marketingPortalRoutes");
const { verifyWebhook } = require("./src/services/metaPageService");
const {
  handleWebhookPayload,
  replyToRecentComments,
  subscribePageEvents,
} = require("./src/services/facebookReplyService");
const superAdminDashboardRoutes = require("./src/routes/superAdminDashboardRoutes");
const crmIntegrationsRoutes = require("./src/routes/crmIntegrationsRoutes");
const customerIdentityRoutes = require("./src/routes/customerIdentityRoutes");
const inventoryRoutes = require("./src/routes/inventoryRoutes");
const socialIntegrationsRoutes = require("./src/routes/socialIntegrationsRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const oemReportingRoutes = require("./src/routes/oemReportingRoutes");
const eventsRoutes = require("./src/routes/eventsRoutes");
const integrationHealthRoutes = require("./src/routes/integrationHealthRoutes");
const pipelineTransparencyRoutes = require("./src/routes/pipelineTransparencyRoutes");
const negotiationControlRoutes = require("./src/routes/negotiationControlRoutes");
const dealHandoffsRoutes = require("./src/routes/dealHandoffsRoutes");
const systemControlsRoutes = require("./src/routes/systemControlsRoutes");
const platformSettingsRoutes = require("./src/routes/platformSettingsRoutes");
const publicScriptRoutes = require("./src/routes/publicScriptRoutes");
const serviceManagerRoutes = require("./src/routes/serviceManagerRoutes");
const serviceAdvisorRoutes = require("./src/routes/serviceAdvisorRoutes");
const inventoryManagerRoutes = require("./src/routes/inventoryManagerRoutes");
const model31Routes = require("./src/routes/model31Routes");
const crmHygieneRoutes = require("./src/routes/crmHygieneRoutes");
const trustPortalRoutes = require("./src/routes/trustPortalRoutes");
const roleNotificationRoutes = require("./src/routes/roleNotificationRoutes");
const { startModel31Jobs } = require("./src/jobs/model31Jobs");
const { startSmsJob } = require("./src/jobs/smsJob");
const { handleSmsWebhook } = require("./src/services/smsInboundService");
const { startYouTubeJob } = require("./src/jobs/youtubeJob");
const { startXJob } = require("./src/jobs/xJob");
const errorHandler = require("./src/middleware/errorHandler");
const { error } = require("./src/utils/response");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

async function healthCheck(req, res) {
  let dbOk = false;
  try {
    const connection = await pool.getConnection();
    try {
      await connection.ping();
      dbOk = true;
    } finally {
      connection.release();
    }
  } catch {
    dbOk = false;
  }

  return res.status(dbOk ? 200 : 503).json({
    success: dbOk,
    message: dbOk
      ? "Server is working, database is connected"
      : "Server is working, database is not connected",
    status: dbOk ? "ok" : "degraded",
    database: dbOk ? "connected" : "not connected",
    databaseName: process.env.DB_NAME || null,
  });
}

app.get("/", healthCheck);
app.get("/api/health", healthCheck);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dealerships", dealershipRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/buyer-personas", buyerPersonaRoutes);
app.use("/api/scoring-rules", scoringRulesRoutes);
app.use("/api/ai-configuration", aiConfigurationRoutes);
app.use("/api/negotiation-templates", negotiationTemplateRoutes);
app.use("/api/dealership", dealershipPortalRoutes);
app.use("/api/bdc", bdcPortalRoutes);
app.use("/api/salesperson", salespersonPortalRoutes);
app.use("/api/scripts/public", publicScriptRoutes);
app.get("/api/marketing/meta/webhook", (req, res) => {
  const challenge = verifyWebhook(req.query);
  if (!challenge) {
    return res.status(403).send("Verification failed");
  }
  return res.status(200).send(challenge);
});
app.post("/webhook/sms", (req, res) => {
  handleSmsWebhook(req)
    .then((result) => {
      res.status(result.status).type(result.type).send(result.body);
    })
    .catch((err) => {
      console.error("[SMS] Webhook failed:", err.message);
      res.status(500).type("text/plain").send("SMS webhook failed");
    });
});
app.post("/api/marketing/meta/webhook", (req, res) => {
  res.sendStatus(200);
  handleWebhookPayload(req.body).catch((err) => {
    console.error("Meta webhook failed:", err.message);
  });
});
app.use("/api/marketing", marketingPortalRoutes);
app.use("/api/service-manager", serviceManagerRoutes);
app.use("/api/service-advisor", serviceAdvisorRoutes);
app.use("/api/inventory-manager", inventoryManagerRoutes);
app.use("/api/super-admin/dashboard", superAdminDashboardRoutes);
app.use("/api/super-admin/crm-integrations", crmIntegrationsRoutes);
app.use("/api/super-admin/customer-identity", customerIdentityRoutes);
app.use("/api/super-admin/inventory", inventoryRoutes);
app.use("/api/super-admin/social-integrations", socialIntegrationsRoutes);
app.use("/api/super-admin/analytics", analyticsRoutes);
app.use("/api/super-admin/oem-reporting", oemReportingRoutes);
app.use("/api/super-admin/events", eventsRoutes);
app.use("/api/super-admin/integration-health", integrationHealthRoutes);
app.use("/api/super-admin/pipeline-transparency", pipelineTransparencyRoutes);
app.use("/api/super-admin/negotiation-control", negotiationControlRoutes);
app.use("/api/super-admin/deal-handoffs", dealHandoffsRoutes);
app.use("/api/super-admin/system-controls", systemControlsRoutes);
app.use("/api/super-admin/settings", platformSettingsRoutes);
app.use("/api/model31", model31Routes);
app.use("/api/crm", crmHygieneRoutes);
app.use("/api/trust", trustPortalRoutes);
app.use("/api/notifications", roleNotificationRoutes);

app.use((req, res) => error(res, "Route not found", 404));
app.use(errorHandler);

async function start() {
  try {
    await pool.connectDatabase();
    try {
      await startModel31Jobs();
    } catch (err) {
      console.error("Model 31 jobs did not start. Run npm run migrate.", err.message);
    }
    try {
      startSmsJob();
    } catch (err) {
      console.error("SMS worker did not start:", err.message);
    }
    try {
      startYouTubeJob();
    } catch (err) {
      console.error("YouTube comment check did not start:", err.message);
    }
    try {
      startXJob();
    } catch (err) {
      console.error("X check did not start:", err.message);
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      subscribePageEvents()
        .catch((err) => {
          console.error("Facebook message subscription failed:", err.message);
        })
        .then(() => replyToRecentComments())
        .catch((err) => {
          console.error("Recent Facebook comments were not checked:", err.message);
        });
    });
  } catch (err) {
    console.error("Database connection failed. Check DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD.");
    console.error(err.message);
    process.exit(1);
  }
}

start();
