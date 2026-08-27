function success(res, payload, statusCode = 200) {
  return res.status(statusCode).json({ success: true, ...payload });
}

function error(res, message, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = { success, error };
