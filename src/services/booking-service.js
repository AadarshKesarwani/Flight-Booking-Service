const axios = require("axios");
const AppError = require("../utils/errors/app-error");
const { ServerConfig } = require("../config");
const db = require("../models");
const { StatusCodes } = require("http-status-codes");

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

module.exports = {
  createBooking,
};
