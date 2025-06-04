const mongoose = require("mongoose");
const { Schema } = mongoose;

const walletSchema = new Schema({
    name: { type: String, required: true, trim: true },
    balance: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
    },
    createdAt: { type: Date, default: Date.now },
});

// Create a "virtual" id field that returns the string of _id
walletSchema.virtual("id").get(function () {
    return this._id.toHexString();
});
walletSchema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
        // Transform Decimal128 to Number with 4 decimal pts
        ret.balance = parseFloat(ret.balance.toString());
        delete ret._id;
    },
});

module.exports = mongoose.model("Wallet", walletSchema);

