const axios = require("axios");
const AppError = require("../utils/errors/app-error");
const { ServerConfig } = require("../config");
const db = require("../models");
const { StatusCodes } = require("http-status-codes");
const { Enums } = require("../utils/common");
const { CONFIRMED, CANCELLED, INITIATED } = Enums.BOOKING_STATUS;

const { BookingRepository } = require("../repositories");






/**
 * Helper to safely update flight seats
 */

async function updateFlightSeats(flightId, seats, increment = false) {
  try {
    await axios.patch(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${flightId}/seats`,
      {
        seats,
        dec: increment ? 0 : 1, // dec=0 → increment, dec=1 → decrement
      },
    );
  } catch (err) {
    throw new AppError(
      "Failed to update flight seats. Please try again.",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
}







/**
 * Create a new booking
 */
async function createBooking(data) {
  const transaction = await db.sequelize.transaction();

  try {
    // Lock flight row to prevent race conditions (optional: implement in flight service)
    const flightResponse = await axios.get(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}?lock=true`,
    );
    const flightData = flightResponse.data.data;

    if (flightData.totalSeats < data.noOfSeats) {
      throw new AppError("Not enough seats available", StatusCodes.BAD_REQUEST);
    }

    const totalCost = flightData.price * data.noOfSeats;

    const bookingRepository = new BookingRepository();
    const booking = await bookingRepository.createBooking(
      {
        flightId: data.flightId,
        userId: data.userId,
        noOfSeats: data.noOfSeats,
        totalCost,
        status: INITIATED,
      },
      transaction,
    );

    // Decrement flight seats immediately to reserve
    await updateFlightSeats(data.flightId, data.noOfSeats);

    await transaction.commit();
    return booking;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}







/**
 * Make payment for a booking
 */

async function makePayment(data) {
  const transaction = await db.sequelize.transaction();

  try {
    const bookingRepository = new BookingRepository();
    const booking = await bookingRepository.get(data.bookingId, transaction);

    if (!booking)
      throw new AppError("Booking not found", StatusCodes.NOT_FOUND);

    if (booking.status === CANCELLED) {
      throw new AppError(
        "Booking is already cancelled",
        StatusCodes.BAD_REQUEST,
      );
    }

    // Timeout check (5 minutes)
    const bookingTime = new Date(booking.createdAt);
    const currentTime = new Date();

    if (currentTime - bookingTime > 300000) {
      // Timeout: cancel booking in a separate transaction to persist
      const timeoutTransaction = await db.sequelize.transaction();
      await bookingRepository.updateBooking(
        data.bookingId,
        { status: CANCELLED },
        timeoutTransaction,
      );

      await updateFlightSeats(booking.flightId, booking.noOfSeats, true);

      await timeoutTransaction.commit();

      throw new AppError(
        "Booking cancelled due to timeout. Seats released.",
        StatusCodes.BAD_REQUEST,
      );
    }

    // Amount check
    if (Number(data.totalCost) !== Number(booking.totalCost)) {
      throw new AppError("Payment amount mismatch", StatusCodes.BAD_REQUEST);
    }

    // User authorization
    if (Number(data.userId) !== Number(booking.userId)) {
      throw new AppError("User not authorized", StatusCodes.UNAUTHORIZED);
    }

    // Payment success → confirm booking
    const confirmedBooking = await bookingRepository.updateBooking(
      data.bookingId,
      { status: CONFIRMED },
      transaction,
    );

    await transaction.commit();
    return confirmedBooking;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}





/**
 * Cancel a booking
 */
// This can be called by user or by a cron job for old bookings
// Idempotent: if already cancelled, just return true
async function cancelBooking(bookingId) {
  const transaction = await db.sequelize.transaction();

  try {
    const bookingRepository = new BookingRepository();
    const booking = await bookingRepository.get(bookingId, transaction);

    if (!booking)
      throw new AppError("Booking not found", StatusCodes.NOT_FOUND);

    if (booking.status === CANCELLED) {
      await transaction.commit();
      return true; // idempotent
    }

    // Release seats
    await updateFlightSeats(booking.flightId, booking.noOfSeats, true);

    // Update status
    await bookingRepository.updateBooking(
      bookingId,
      { status: CANCELLED },
      transaction,
    );

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}




/// Cancel old bookings that are still in INITIATED status after 5 minutes
// This function is called by a cron job every 10 seconds
async function cancelOldBookings() {
  const bookingRepository = new BookingRepository();

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const cancelledCount =
      await bookingRepository.cancelOldBookings(fiveMinutesAgo);

    return cancelledCount;
  } catch (error) {
    throw new AppError(
      "Failed to cancel old bookings",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}





module.exports = {
  createBooking,
  makePayment,
  cancelBooking,
cancelOldBookings,
};
