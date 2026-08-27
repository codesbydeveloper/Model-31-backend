const buyerPersonaService = require("../services/buyerPersonaService");
const { success } = require("../utils/response");

async function list(req, res, next) {
  try {
    const { personas, pagination } = await buyerPersonaService.listPersonas(req.query);
    return success(res, { personas, pagination });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const persona = await buyerPersonaService.getPersona(req.params.id);
    return success(res, { persona });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const persona = await buyerPersonaService.createPersona(req.body);
    return success(res, { message: "Buyer persona created successfully", persona }, 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const persona = await buyerPersonaService.updatePersona(req.params.id, req.body);
    return success(res, { message: "Buyer persona updated successfully", persona });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await buyerPersonaService.deletePersona(req.params.id);
    return success(res, { message: "Buyer persona deleted successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
