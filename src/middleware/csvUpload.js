const multer = require("multer");
const AppError = require("../utils/AppError");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const name = String(file.originalname || "").toLowerCase();
    const type = String(file.mimetype || "").toLowerCase();
    if (
      name.endsWith(".csv") ||
      type.includes("csv") ||
      type.includes("excel") ||
      type === "text/plain" ||
      type === "application/octet-stream" ||
      type === "application/vnd.ms-excel"
    ) {
      cb(null, true);
      return;
    }
    cb(new Error("Only CSV files are allowed"));
  },
}).any();

function csvUpload(req, res, next) {
  upload(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "CSV file must be 8 MB or smaller"
          : err.message || "CSV upload failed";
      return next(new AppError(message, 400));
    }
    req.file = req.file || (Array.isArray(req.files) ? req.files[0] : null);
    if (!req.file) return next(new AppError("CSV file is required", 400));
    next();
  });
}

module.exports = { csvUpload };
