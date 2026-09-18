require("dotenv").config();
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
app.use("/api/marketing", marketingPortalRoutes);
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

app.use((req, res) => error(res, "Route not found", 404));
app.use(errorHandler);

async function start() {
  try {
    await pool.connectDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Database connection failed. Check DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD.");
    console.error(err.message);
    process.exit(1);
  }
}

start();
