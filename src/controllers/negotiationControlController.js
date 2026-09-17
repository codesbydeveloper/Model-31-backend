const svc = require("../services/negotiationControlService");
const { success } = require("../utils/response");

async function list(req, res, next) {
  try {
    return success(res, svc.listRecords(req.query));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    return success(res, svc.getRecord(req.params.id, req.query));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    return success(res, svc.updateRecord(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, update };
