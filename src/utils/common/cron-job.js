const cron = require("node-cron");

const {BookingService}= require("../../services");

function scheduleCronJob() {
     cron.schedule("*/30 * * * * *", async () => {
        try {
            await BookingService.cancelOldBookings();
            console.log("Cancelled old bookings successfully");
        } catch (error) {
            console.error("Error cancelling old bookings:", error);
        }
    });
}

module.exports = scheduleCronJob;