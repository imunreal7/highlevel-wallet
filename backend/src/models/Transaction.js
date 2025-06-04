const mongoose = require("mongoose");
const { Schema } = mongoose;

const transactionSchema = new Schema({
    walletId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Wallet",
        required: true,
    },
    amount: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
    },
    balance: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
    },
    description: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    type: {
        type: String,
        enum: ["CREDIT", "DEBIT"],
        required: true,
    },
});

transactionSchema.virtual("id").get(function () {
    return this._id.toHexString();
});
transactionSchema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
        ret.amount = parseFloat(ret.amount.toString());
        ret.balance = parseFloat(ret.balance.toString());
        delete ret._id;
    },
});

module.exports = mongoose.model("Transaction", transactionSchema);

