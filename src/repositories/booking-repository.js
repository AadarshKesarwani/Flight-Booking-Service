const { StatusCodes } = require("http-status-codes");
const AppError = require("../utils/errors/app-error");

const {Booking} = require("../models");
const CrudRepository = require("./crud-repository");

class BookingRepository extends CrudRepository {
    constructor(){ 
        super(Booking);
    }


    async createBooking(data, transaction) {
        const response = await Booking.create(data, {transaction: transaction},{logging: true});
        return response;
    }
}
    

module.exports = BookingRepository;