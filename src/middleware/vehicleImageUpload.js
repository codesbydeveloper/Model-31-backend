const path = require("path");
const fs = require("fs");
const multer = require("multer");

const uploadDir = path.join(__dirname, "../../uploads/vehicles");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
    cb(null, `veh_${Date.now()}_${Math.random().toString(16).slice(2, 8)}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  if (String(file.mimetype || "").startsWith("image/")) {
    cb(null, true);
    return;
  }
  cb(new Error("Only image files are allowed"));
}

const uploadVehicleImages = multer({
  storage,
  fileFilter,
  limits: { files: 10, fileSize: 5 * 1024 * 1024 },
}).array("images", 10);

function vehicleImageUpload(req, res, next) {
  uploadVehicleImages(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each image must be 5 MB or smaller"
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
          ? "You can upload up to 10 images"
          : err.message || "Image upload failed";
    return res.status(400).json({ success: false, message });
  });
}

module.exports = { vehicleImageUpload };
