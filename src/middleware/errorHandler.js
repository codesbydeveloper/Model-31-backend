const AppError = require("../utils/AppError");

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message: "Email already registered",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
}

module.exports = errorHandler;
