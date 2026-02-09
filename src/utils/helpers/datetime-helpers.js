function isAfter(time1, time2) {
    return new Date(time1) > new Date(time2);
}

module.exports = {
    isAfter
};
