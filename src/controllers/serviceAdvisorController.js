const svc = require("../services/serviceAdvisorService");
const { success } = require("../utils/response");

async function dashboard(req, res, next) {
  try {
    return success(res, await svc.getDashboard(req.user));
  } catch (err) {
    next(err);
  }
}

async function listJobs(req, res, next) {
  try {
    return success(res, await svc.listJobs(req.user, req.query));
  } catch (err) {
    next(err);
  }
}

async function getJob(req, res, next) {
  try {
    return success(res, await svc.getJob(req.user, req.params.id));
  } catch (err) {
    next(err);
  }
}

async function updateJob(req, res, next) {
  try {
    return success(res, await svc.updateJob(req.user, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function listAppointments(req, res, next) {
  try {
    return success(res, await svc.listAppointments(req.user, req.query));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboard,
  listJobs,
  getJob,
  updateJob,
  listAppointments,
};
