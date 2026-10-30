const svc = require("../services/roleNotificationService");
const { success } = require("../utils/response");

async function list(req, res, next) {
  try {
    return success(res, await svc.listNotifications(req.user, req.query));
  } catch (err) {
    next(err);
  }
}

async function unreadCount(req, res, next) {
  try {
    return success(res, await svc.getUnreadCount(req.user));
  } catch (err) {
    next(err);
  }
}

async function catalog(req, res, next) {
  try {
    return success(res, svc.getCatalog(req.user));
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    return success(res, await svc.markRead(req.user, req.params.id));
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    return success(res, await svc.markAllRead(req.user));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    return success(res, { notification: await svc.createNotification(req.body) }, 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  unreadCount,
  catalog,
  markRead,
  markAllRead,
  create,
};
