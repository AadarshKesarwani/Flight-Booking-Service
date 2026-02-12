const { StatusCodes } = require("http-status-codes");
const AppError = require("../utils/errors/app-error");

const {Booking} = require("../models");
const CrudRepository = require("./crud-repository");

class BookingRepository extends CrudRepository {
    constructor(){ 
        super(Booking);
    }


   async createBooking(data, transaction) {
        const response = await Booking.create(data, {
            transaction,
            logging: console.log
        });
        return response;
    }


    async get(id, transaction) {
        const response = await Booking.findByPk(id, {
            transaction,
            logging: console.log
        });
        if (!response) {
            throw new AppError("Booking not found", StatusCodes.NOT_FOUND);
        }
        return response;
    }


    
    async updateBooking(id, data, transaction) {
        const booking = await Booking.findByPk(id, { transaction });

        if (!booking) {
            throw new AppError("Booking not found", StatusCodes.NOT_FOUND);
        }

        const response = await booking.update(data, {
            transaction,
            logging: console.log
        });

        return response;
    }

}
    

module.exports = BookingRepository;