const { BookingService } = require("../services");
const { StatusCodes } = require("http-status-codes");
const { SuccessResponse, ErrorResponse } = require("../utils/common");

async function createBooking(req, res) {
  try {
    const response = await BookingService.createBooking({
      flightId: req.body.flightId,
      userId: req.body.userId,
      noOfSeats: req.body.noOfSeats,
    });


    SuccessResponse.data = response;
    SuccessResponse.message = "Booking created successfully";

    return res.status(StatusCodes.CREATED).json(SuccessResponse);

  } catch (error) {
    ErrorResponse.error = error;
    return res
      .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
      .json(ErrorResponse);
  }
}



async function makePayment(req, res) {
    try {
        const response = await BookingService.makePayment({
            bookingId: req.body.bookingId,
            totalCost  : req.body.totalCost,
            userId : req.body.userId,
        });

        SuccessResponse.data = response;
        SuccessResponse.message = "Payment successful";

        return res.status(StatusCodes.OK).json(SuccessResponse);
    } catch (error) {
        ErrorResponse.error = error;
        return res
            .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
            .json(ErrorResponse);
    }
}



module.exports = {
  createBooking,
  makePayment,
};
