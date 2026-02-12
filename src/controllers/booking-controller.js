const { BookingService } = require("../services");
const { StatusCodes } = require("http-status-codes");
const { SuccessResponse, ErrorResponse } = require("../utils/common");


const inMemoryDb = {};


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
        const idempotencyKey = req.headers["x-idempotency-key"];
        if (!idempotencyKey || inMemoryDb[idempotencyKey]) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message : "cannot retry on a successful payment with same idempotency key"
            });
        }
        const response = await BookingService.makePayment({
            bookingId: req.body.bookingId,
            totalCost  : req.body.totalCost,
            userId : req.body.userId,
        });

        inMemoryDb[idempotencyKey] = idempotencyKey;


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
