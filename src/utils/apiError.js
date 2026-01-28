exports.apiError = (res, status, code, message) => {
  return res.status(status).json({
    success: false,
    code,
    message,
  });
};
