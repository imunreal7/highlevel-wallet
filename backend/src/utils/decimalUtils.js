const mongoose = require("mongoose");

function toDecimal128(value) {
    // Round to 4 decimal places using JS → string, then Decimal128
    // e.g. 10.123456 → "10.1235"
    const rounded = (Math.round(parseFloat(value) * 10000) / 10000).toFixed(4);
    return mongoose.Types.Decimal128.fromString(rounded);
}

module.exports = { toDecimal128 };

