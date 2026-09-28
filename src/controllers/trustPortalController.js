const trustPortalService = require("../services/trustPortalService");
const { success } = require("../utils/response");

function scopedDealershipId(req) {
  if (req.trustAll) return req.query.dealershipId || null;
  return req.dealershipId;
}

async function ingestSoldLog(req, res, next) {
  try {
    const dealershipId = req.trustAll ? req.body.dealershipId : req.dealershipId;
    const result = await trustPortalService.ingestSoldLog({
      dealershipId,
      units: req.body.units,
      month: req.body.month,
    });
    return success(res, { message: "Sold log ingested", ...result }, 201);
  } catch (err) {
    next(err);
  }
}

async function runAttribution(req, res, next) {
  try {
    const result = await trustPortalService.runAttribution({
      dealershipId: req.body.dealershipId || req.query.dealershipId || null,
      month: req.body.month || req.query.month,
    });
    return success(res, { message: "Attribution complete", ...result });
  } catch (err) {
    next(err);
  }
}

async function listInvoices(req, res, next) {
  try {
    return success(
      res,
      await trustPortalService.listInvoices({
        dealershipId: scopedDealershipId(req),
        page: req.query.page,
        limit: req.query.limit,
      })
    );
  } catch (err) {
    next(err);
  }
}

async function getInvoice(req, res, next) {
  try {
    const dealershipId = req.trustAll ? null : req.dealershipId;
    return success(res, await trustPortalService.getInvoice(req.params.id, dealershipId));
  } catch (err) {
    next(err);
  }
}

async function getLineItem(req, res, next) {
  try {
    const dealershipId = req.trustAll ? null : req.dealershipId;
    return success(res, await trustPortalService.getLineItem(req.params.id, dealershipId));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  ingestSoldLog,
  runAttribution,
  listInvoices,
  getInvoice,
  getLineItem,
};
