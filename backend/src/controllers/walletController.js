// src/controllers/walletController.js
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");
const { toDecimal128 } = require("../utils/decimalUtils");

/**
 * POST /setup
 * Body: { balance, name }
 * - Creates a new wallet.
 * - Creates an initial "Setup" transaction with type CREDIT for that amount.
 */
async function setupWallet(req, res, next) {
    try {
        const { balance, name } = req.body;
        if (typeof name !== "string" || name.trim().length === 0) {
            throw Object.assign(new Error("Name is required"), { statusCode: 400 });
        }
        const initial = parseFloat(balance);
        if (isNaN(initial)) {
            throw Object.assign(new Error("Invalid balance"), { statusCode: 400 });
        }

        // Convert to Decimal128 (4 decimal places)
        const initialDecimal = toDecimal128(initial);

        // Create the wallet document (no session)
        const wallet = await Wallet.create({
            name: name.trim(),
            balance: initialDecimal,
        });

        // Create the initial transaction (no session)
        const txn = await Transaction.create({
            walletId: wallet._id,
            amount: initialDecimal,
            balance: initialDecimal,
            description: "Setup",
            type: "CREDIT",
        });

        // Format response: { id, balance, transactionId, name, date }
        res.status(200).json({
            id: wallet.id,
            balance: parseFloat(wallet.balance.toString()),
            transactionId: txn.id,
            name: wallet.name,
            date: wallet.createdAt,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /transact/:walletId
 * Body: { amount, description }
 * - amount > 0 → credit
 * - amount < 0 → debit
 * - Updates wallet balance, then creates a new transaction.
 */
async function transact(req, res, next) {
    try {
        const { amount, description } = req.body;
        const { walletId } = req.params;

        // Validate walletId exists and is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(walletId)) {
            throw Object.assign(new Error("Invalid walletId"), { statusCode: 400 });
        }
        const wallet = await Wallet.findById(walletId);
        if (!wallet) {
            throw Object.assign(new Error("Wallet not found"), { statusCode: 404 });
        }

        // Validate amount
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt === 0) {
            throw Object.assign(new Error("Amount must be a nonzero number"), { statusCode: 400 });
        }
        // Convert to Decimal128 with 4 decimal places
        const amtDecimal = toDecimal128(amt);

        // Determine new balance
        const updatedWallet = await Wallet.findOneAndUpdate(
            { _id: walletId },
            { $inc: { balance: amtDecimal } },
            { new: true },
        );

        // Check for negative balance if you don't allow it
        if (parseFloat(updatedWallet.balance.toString()) < 0) {
            // If not allowed, roll back the change by pushing the opposite inc
            await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: toDecimal128(-amt) } });
            throw Object.assign(new Error("Insufficient funds"), { statusCode: 400 });
        }

        // Create transaction
        const txnType = amt > 0 ? "CREDIT" : "DEBIT";
        const txn = await Transaction.create({
            walletId: updatedWallet._id,
            amount: amtDecimal,
            balance: updatedWallet.balance,
            description: description?.trim() || "",
            type: txnType,
        });

        res.status(200).json({
            balance: parseFloat(updatedWallet.balance.toString()),
            transactionId: txn.id,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /transactions
 * Query params: walletId, skip, limit
 */
async function getTransactions(req, res, next) {
    try {
        const { walletId, skip = 0, limit = 10 } = req.query;

        // Validate walletId
        if (!walletId || !mongoose.Types.ObjectId.isValid(walletId)) {
            throw Object.assign(new Error("Invalid or missing walletId"), { statusCode: 400 });
        }

        const skipNum = parseInt(skip, 10);
        const limitNum = parseInt(limit, 10);
        if (isNaN(skipNum) || skipNum < 0) {
            throw Object.assign(new Error("skip must be a non-negative integer"), {
                statusCode: 400,
            });
        }
        if (isNaN(limitNum) || limitNum <= 0) {
            throw Object.assign(new Error("limit must be a positive integer"), { statusCode: 400 });
        }

        const walletExists = await Wallet.exists({ _id: walletId });
        if (!walletExists) {
            throw Object.assign(new Error("Wallet not found"), { statusCode: 404 });
        }

        // Fetch transactions sorted by date descending
        const txns = await Transaction.find({ walletId })
            .sort({ date: -1 })
            .skip(skipNum)
            .limit(limitNum)
            .lean()
            .exec();

        // Serialize
        const serialized = txns.map((t) => ({
            id: t._id.toHexString(),
            walletId: t.walletId.toHexString(),
            amount: parseFloat(t.amount.toString()),
            balance: parseFloat(t.balance.toString()),
            description: t.description,
            date: t.date,
            type: t.type,
        }));

        res.status(200).json(serialized);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /wallet/:id
 */
async function getWallet(req, res, next) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw Object.assign(new Error("Invalid wallet id"), { statusCode: 400 });
        }
        const wallet = await Wallet.findById(id).lean();
        if (!wallet) {
            throw Object.assign(new Error("Wallet not found"), { statusCode: 404 });
        }
        res.status(200).json({
            id: wallet._id.toHexString(),
            balance: parseFloat(wallet.balance.toString()),
            name: wallet.name,
            date: wallet.createdAt,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    setupWallet,
    transact,
    getTransactions,
    getWallet,
};

