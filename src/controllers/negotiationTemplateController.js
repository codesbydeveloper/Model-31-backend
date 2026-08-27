const negotiationTemplateService = require("../services/negotiationTemplateService");
const { success } = require("../utils/response");

async function list(req, res, next) {
  try {
    const { templates, pagination } =
      await negotiationTemplateService.listTemplates(req.query);
    return success(res, { templates, pagination });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const template = await negotiationTemplateService.getTemplate(req.params.id);
    return success(res, { template });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const template = await negotiationTemplateService.createTemplate(req.body);
    return success(res, { message: "Template created successfully", template }, 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const template = await negotiationTemplateService.updateTemplate(
      req.params.id,
      req.body
    );
    return success(res, { message: "Template updated successfully", template });
  } catch (err) {
    next(err);
  }
}

async function duplicate(req, res, next) {
  try {
    const template = await negotiationTemplateService.duplicateTemplate(
      req.params.id
    );
    return success(res, { message: "Template duplicated successfully", template }, 201);
  } catch (err) {
    next(err);
  }
}

async function setStatus(req, res, next) {
  try {
    const template = await negotiationTemplateService.setTemplateStatus(
      req.params.id,
      req.body.status
    );
    return success(res, { message: "Template status updated", template });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await negotiationTemplateService.deleteTemplate(req.params.id);
    return success(res, { message: "Template deleted successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, duplicate, setStatus, remove };
