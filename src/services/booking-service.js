const axios = require("axios");
const AppError = require("../utils/errors/app-error");
const { ServerConfig } = require("../config");
const db = require("../models");
const { StatusCodes } = require("http-status-codes");
const { Enums } = require("../utils/common");
const {CONFIRMED,CANCELLED,PENDING,INITIATED} = Enums.BOOKING_STATUS;



const { BookingRepository } = require("../repositories");

async function createBooking(data) {
  const transaction = await db.sequelize.transaction();

  try {
    const flightResponse = await axios.get(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`,
    );

    const flightData = flightResponse.data.data;

    if (flightData.totalSeats < data.noOfSeats) {
      throw new AppError("Not enough seats available", StatusCodes.BAD_REQUEST);
    }

    const totalBillingAmount = flightData.price * data.noOfSeats;

    const bookingPayload = {
      //...data,
      flightId: data.flightId,
      userId: data.userId,
      noOfSeats: data.noOfSeats,
      totalCost: totalBillingAmount,
    };

    const bookingRepository = new BookingRepository();
    const booking = await bookingRepository.createBooking(
      bookingPayload,
      transaction,
    );

    //after payment success only then update the flight seats

    await axios.patch(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`,
      {
        seats: data.noOfSeats
      },
    );

    await transaction.commit();
    return booking;
  } catch (error) {
    await transaction.rollback();
    throw error; //  THIS IS MANDATORY
  }
}






async function makePayment(data) {
    const transaction = await db.sequelize.transaction();

    try {
        const bookingRepository = new BookingRepository();

        const bookingDetails = await bookingRepository.get(
            data.bookingId,
            transaction
        );

        // 1️ Already cancelled
        if (bookingDetails.status === CANCELLED) {
            throw new AppError(
                "Booking is already cancelled",
                StatusCodes.BAD_REQUEST
            );
        }

        // 2️ Timeout check (5 minutes)
        const bookingTime = new Date(bookingDetails.createdAt);
        const currentTime = new Date();

        if (currentTime - bookingTime > 300000) {

            // cancel booking
            await bookingRepository.updateBooking(
                data.bookingId,
                { status: CANCELLED },
                transaction
            );

            //  release seats back to flight service
            await axios.patch(
                `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${bookingDetails.flightId}/seats`,
                {
                    seats: bookingDetails.noOfSeats,
                    dec: 0 // increment seats
                }
            );

            throw new AppError(
                "Booking cancelled due to timeout. Seats released.",
                StatusCodes.BAD_REQUEST
            );
        }

        // 3️ Amount verification
        if (Number(bookingDetails.totalCost) !== Number(data.totalCost)) {
            throw new AppError(
                "The amount of the payment does not match",
                StatusCodes.BAD_REQUEST
            );
        }

        // 4️ User authorization
        if (Number(bookingDetails.userId) !== Number(data.userId)) {
            throw new AppError(
                "User not authorized to make payment for this booking",
                StatusCodes.UNAUTHORIZED
            );
        }

        // 5️ Payment success → confirm booking
        const response = await bookingRepository.updateBooking(
            data.bookingId,
            { status: CONFIRMED },
            transaction
        );

        await transaction.commit();
        return response;

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}



module.exports = {
  createBooking,
    makePayment,
};
