const express = require("express");
const router = express.Router();
const {
    setupWallet,
    transact,
    getTransactions,
    getWallet,
} = require("../controllers/walletController");

// Initialize wallet
router.post("/setup", setupWallet);

// Credit / Debit
router.post("/transact/:walletId", transact);

// Fetch transactions
router.get("/transactions", getTransactions);

// Get wallet details
router.get("/wallet/:id", getWallet);

module.exports = router;

