const authService = require("../services/authService");
const { success } = require("../utils/response");

async function login(req, res, next) {
  try {
    const { token, user } = await authService.login(req.body);
    return success(res, { message: "Login successful", token, user });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
