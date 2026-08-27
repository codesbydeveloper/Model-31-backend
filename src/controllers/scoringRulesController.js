const scoringRulesService = require("../services/scoringRulesService");
const { success } = require("../utils/response");

async function get(req, res, next) {
  try {
    const scoringRules = await scoringRulesService.getScoringRules();
    return success(res, { scoringRules });
  } catch (err) {
    next(err);
  }
}

async function save(req, res, next) {
  try {
    const scoringRules = await scoringRulesService.saveScoringRules(req.body);
    return success(res, {
      message: "Scoring rules saved successfully",
      scoringRules,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { get, save };
