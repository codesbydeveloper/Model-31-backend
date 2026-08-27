const leadService = require("../services/leadService");
const { success } = require("../utils/response");

async function list(req, res, next) {
  try {
    const { leads, pagination, stats } = await leadService.listLeads(req.query);
    return success(res, { leads, pagination, stats });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const lead = await leadService.getLead(req.params.id);
    return success(res, { lead });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const lead = await leadService.createLead(req.body);
    return success(res, { message: "Lead created successfully", lead }, 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const lead = await leadService.updateLead(req.params.id, req.body);
    return success(res, { message: "Lead updated successfully", lead });
  } catch (err) {
    next(err);
  }
}

async function setStatus(req, res, next) {
  try {
    const lead = await leadService.setLeadStatus(req.params.id, req.body.status);
    return success(res, { message: "Lead status updated", lead });
  } catch (err) {
    next(err);
  }
}

async function assign(req, res, next) {
  try {
    const lead = await leadService.assignSalesperson(req.params.id, req.body.salespersonId);
    return success(res, { message: "Salesperson assigned", lead });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, setStatus, assign };
