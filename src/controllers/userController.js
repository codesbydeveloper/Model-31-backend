const userService = require("../services/userService");
const { success } = require("../utils/response");

async function listRoles(req, res, next) {
  try {
    return success(res, userService.getRoleOptions());
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { users, pagination, roles } = await userService.listUsers(req.query);
    return success(res, { users, pagination, roles });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const user = await userService.getUser(req.params.id);
    return success(res, { user });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    return success(res, { message: "User created successfully", user }, 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return success(res, { message: "User updated successfully", user });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await userService.deleteUser(req.params.id, req.user?.id);
    return success(res, { message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRoles, list, getOne, create, update, remove };
