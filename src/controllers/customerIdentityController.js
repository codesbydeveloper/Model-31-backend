const svc = require("../services/customerIdentityService");
const { success } = require("../utils/response");

async function list(req, res, next) {
  try {
    return success(res, svc.listCustomers(req.query));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    return success(res, svc.getCustomerDetail(req.params.customerId));
  } catch (err) {
    next(err);
  }
}

async function duplicateReview(req, res, next) {
  try {
    return success(res, svc.getDuplicateReview(req.params.customerId));
  } catch (err) {
    next(err);
  }
}

async function merge(req, res, next) {
  try {
    return success(res, svc.mergeDuplicate(req.params.customerId, req.body));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, duplicateReview, merge };
