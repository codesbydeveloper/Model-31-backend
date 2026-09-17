const svc = require("../services/dealHandoffsService");
const { success } = require("../utils/response");

async function list(req, res, next) {
  try {
    return success(res, svc.listHandoffs(req.query));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    return success(res, svc.getHandoffDetail(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function visualPackage(req, res, next) {
  try {
    return success(res, svc.getVisualPackage(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function acceptHandoff(req, res, next) {
  try {
    return success(res, svc.acceptHandoff(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function requestMoreInfo(req, res, next) {
  try {
    return success(res, svc.requestMoreInfo(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function takeOver(req, res, next) {
  try {
    return success(res, svc.takeOver(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function markClosed(req, res, next) {
  try {
    return success(res, svc.markClosed(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function openLead(req, res, next) {
  try {
    return success(res, svc.openLead(req.params.id));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  visualPackage,
  acceptHandoff,
  requestMoreInfo,
  takeOver,
  markClosed,
  openLead,
};
