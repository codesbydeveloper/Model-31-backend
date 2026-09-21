const svc = require("../services/serviceManagerService");
const { success } = require("../utils/response");

async function dashboard(req, res, next) {
  try {
    return success(res, await svc.getDashboard(req.dealershipId));
  } catch (err) {
    next(err);
  }
}

async function listJobs(req, res, next) {
  try {
    return success(res, await svc.listJobs(req.dealershipId, req.query));
  } catch (err) {
    next(err);
  }
}

async function getJob(req, res, next) {
  try {
    return success(res, await svc.getJob(req.dealershipId, req.params.id));
  } catch (err) {
    next(err);
  }
}

async function createJob(req, res, next) {
  try {
    return success(res, await svc.createJob(req.dealershipId, req.body), 201);
  } catch (err) {
    next(err);
  }
}

async function updateJob(req, res, next) {
  try {
    return success(res, await svc.updateJob(req.dealershipId, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function listDelayedJobs(req, res, next) {
  try {
    return success(res, await svc.listDelayedJobs(req.dealershipId, req.query));
  } catch (err) {
    next(err);
  }
}

async function listAdvisors(req, res, next) {
  try {
    return success(res, await svc.listAdvisors(req.dealershipId));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboard,
  listJobs,
  listDelayedJobs,
  getJob,
  createJob,
  updateJob,
  listAdvisors,
};
