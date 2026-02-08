const { StatusCodes } = require("http-status-codes");

const info = (req, res) => {
  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Info controller is working properly.",
    error: {},
    data: {},
  });
};

module.exports = {
  info,
};
