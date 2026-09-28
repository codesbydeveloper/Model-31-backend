const { getHygieneSnapshot } = require("../services/hygieneStats");
const { getMeltPlateStatus } = require("../services/crmMeltPlate");
const {
  ROUTING_CONFIG,
  CIRCUIT_BREAKER_MS,
  listBands,
  listRoutingLogs,
} = require("../services/routingEngineService");
const { listGuardEvents, SLA_MINUTES } = require("../services/salespersonGuardService");
const { success } = require("../utils/response");

async function engine(req, res, next) {
  try {
    return success(res, {
      version: "31.0",
      sealed: true,
      writeRoutes: false,
      core: "Model 31 Immutable Engine",
    });
  } catch (err) {
    next(err);
  }
}

async function workflow(req, res, next) {
  try {
    return success(res, {
      status: "active",
      core: "Model 31 Immutable Engine",
      sealed: true,
      hygiene: getHygieneSnapshot(),
      meltPlate: getMeltPlateStatus(),
    });
  } catch (err) {
    next(err);
  }
}

async function routing(req, res, next) {
  try {
    return success(res, {
      status: "active",
      rules: "Fixed Code-Level Routing",
      circuitBreakerMs: CIRCUIT_BREAKER_MS,
      config: ROUTING_CONFIG,
      slaMinutes: SLA_MINUTES,
    });
  } catch (err) {
    next(err);
  }
}

async function bands(req, res, next) {
  try {
    return success(res, await listBands());
  } catch (err) {
    next(err);
  }
}

async function routingLogs(req, res, next) {
  try {
    return success(res, await listRoutingLogs(req.query));
  } catch (err) {
    next(err);
  }
}

async function guards(req, res, next) {
  try {
    return success(res, await listGuardEvents(req.query));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  engine,
  workflow,
  routing,
  bands,
  routingLogs,
  guards,
};
