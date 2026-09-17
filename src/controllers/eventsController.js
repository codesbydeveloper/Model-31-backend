const svc = require("../services/eventsService");
const { success } = require("../utils/response");

async function list(req, res, next) {
  try {
    return success(res, svc.listEvents(req.query));
  } catch (err) {
    next(err);
  }
}

async function quickView(req, res, next) {
  try {
    return success(res, svc.getQuickView(req.params.eventId));
  } catch (err) {
    next(err);
  }
}

async function fullDetail(req, res, next) {
  try {
    return success(res, svc.getFullDetail(req.params.eventId));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, quickView, fullDetail };
