const { StatusCodes } = require("http-status-codes");
const AppError = require("../utils/errors/app-error");
const { Op } = require("sequelize");
const { BOOKING_STATUS } = require("../utils/common/enums");

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
       
    
    async cancelOldBookings(time) {
    const [affectedRows] = await Booking.update(
        { status: BOOKING_STATUS.CANCELLED },
        {
        where: {
            status: BOOKING_STATUS.INITIATED,
            createdAt: { [Op.lt]: time }
        }
        }
    );

    return affectedRows;
    }


}
    

module.exports = BookingRepository;