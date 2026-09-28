class AppError extends Error {
  constructor(message, statusCode = 400, extras = null) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
    if (extras && typeof extras === "object") {
      this.extras = extras;
    }
  }
}

module.exports = AppError;
