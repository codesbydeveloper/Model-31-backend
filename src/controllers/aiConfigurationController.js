const aiConfigurationService = require("../services/aiConfigurationService");
const { success } = require("../utils/response");

async function get(req, res, next) {
  try {
    const aiConfiguration = await aiConfigurationService.getAiConfiguration();
    return success(res, { aiConfiguration });
  } catch (err) {
    next(err);
  }
}

async function save(req, res, next) {
  try {
    const aiConfiguration = await aiConfigurationService.saveAiConfiguration(
      req.body
    );
    return success(res, {
      message: "AI configuration saved successfully",
      aiConfiguration,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { get, save };
