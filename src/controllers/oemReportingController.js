const svc = require("../services/oemReportingService");
const { success } = require("../utils/response");

async function overview(req, res, next) {
  try {
    return success(res, svc.getOverview(req.query));
  } catch (err) {
    next(err);
  }
}

async function exportReport(req, res, next) {
  try {
    const exported = svc.exportReport(req.query);
    if (exported.format === "csv") {
      res.setHeader("Content-Type", exported.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${exported.filename}"`
      );
      return res.status(200).send(exported.content);
    }
    return success(res, {
      filename: exported.filename,
      oemReporting: exported.content,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { overview, exportReport };
