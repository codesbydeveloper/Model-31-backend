require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./src/config/database");
const { runMigrations } = require("./src/migrations/migrate");
const { seedDemoData } = require("./src/services/seedService");
const authRoutes = require("./src/routes/authRoutes");
const dealershipRoutes = require("./src/routes/dealershipRoutes");
const leadRoutes = require("./src/routes/leadRoutes");
const cityRoutes = require("./src/routes/cityRoutes");
const buyerPersonaRoutes = require("./src/routes/buyerPersonaRoutes");
const scoringRulesRoutes = require("./src/routes/scoringRulesRoutes");
const userRoutes = require("./src/routes/userRoutes");
const negotiationTemplateRoutes = require("./src/routes/negotiationTemplateRoutes");
const dealershipPortalRoutes = require("./src/routes/dealershipPortalRoutes");
const bdcPortalRoutes = require("./src/routes/bdcPortalRoutes");
const salespersonPortalRoutes = require("./src/routes/salespersonPortalRoutes");
const marketingPortalRoutes = require("./src/routes/marketingPortalRoutes");
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

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dealerships", dealershipRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/buyer-personas", buyerPersonaRoutes);
app.use("/api/scoring-rules", scoringRulesRoutes);
app.use("/api/negotiation-templates", negotiationTemplateRoutes);
app.use("/api/dealership", dealershipPortalRoutes);
app.use("/api/bdc", bdcPortalRoutes);
app.use("/api/salesperson", salespersonPortalRoutes);
app.use("/api/marketing", marketingPortalRoutes);

app.use((req, res) => error(res, "Route not found", 404));
app.use(errorHandler);

async function start() {
  try {
    await pool.connectDatabase();
    await runMigrations();
    await seedDemoData();
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
