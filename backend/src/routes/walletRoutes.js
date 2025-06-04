// backend/src/routes/walletRoutes.js
const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const {
    setupWallet,
    transact,
    getTransactions,
    getWallet,
} = require("../controllers/walletController");
const validateRequest = require("../middlewares/validateRequest");

//Initialize wallet
router.post(
    "/setup",
    [
        // name must exist, be a non-empty string
        body("name")
            .exists()
            .withMessage("name is required")
            .bail()
            .isString()
            .withMessage("name must be a string")
            .bail()
            .trim()
            .notEmpty()
            .withMessage("name cannot be empty"),
        // balance is optional; if provided, must be a decimal with up to 4 places
        body("balance")
            .optional()
            .isFloat({ min: 0 })
            .withMessage("balance must be a non-negative number")
            .bail()
            .custom((val) => {
                // up to 4 decimal places
                const str = val.toString();
                if (!/^\d+(\.\d{1,4})?$/.test(str)) {
                    throw new Error("balance can have at most 4 decimal places");
                }
                return true;
            }),
        validateRequest,
    ],
    setupWallet,
);

// Credit/Debit
router.post(
    "/transact/:walletId",
    [
        // walletId must be a valid MongoDB ObjectId
        param("walletId")
            .exists()
            .withMessage("walletId is required")
            .bail()
            .isMongoId()
            .withMessage("walletId must be a valid MongoDB ObjectId"),
        // amount is required, non-zero, and up to 4 decimal places
        body("amount")
            .exists()
            .withMessage("amount is required")
            .bail()
            .isFloat()
            .withMessage("amount must be a number")
            .bail()
            .custom((val) => {
                if (parseFloat(val) === 0) {
                    throw new Error("amount cannot be zero");
                }
                // 4 decimal places max
                if (!/^-?\d+(\.\d{1,4})?$/.test(val.toString())) {
                    throw new Error("amount can have at most 4 decimal places");
                }
                return true;
            }),
        // description is optional but if present, must be a non-empty string (max length e.g. 100)
        body("description")
            .optional()
            .isString()
            .withMessage("description must be a string")
            .bail()
            .trim()
            .isLength({ max: 100 })
            .withMessage("description cannot exceed 100 characters"),
        validateRequest,
    ],
    transact,
);

// Fetch transactions
router.get(
    "/transactions",
    [
        query("walletId")
            .exists()
            .withMessage("walletId is required")
            .bail()
            .isMongoId()
            .withMessage("walletId must be a valid MongoDB ObjectId"),
        query("skip")
            .optional()
            .isInt({ min: 0 })
            .withMessage("skip must be a non-negative integer"),
        query("limit").optional().isInt({ min: 1 }).withMessage("limit must be a positive integer"),
        validateRequest,
    ],
    getTransactions,
);

// Get wallet details
router.get(
    "/wallet/:id",
    [
        param("id")
            .exists()
            .withMessage("id is required")
            .bail()
            .isMongoId()
            .withMessage("id must be a valid MongoDB ObjectId"),
        validateRequest,
    ],
    getWallet,
);

module.exports = router;

