const { validationResult } = require("express-validator");

function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Return first validation error or all in an array
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

module.exports = validateRequest;

