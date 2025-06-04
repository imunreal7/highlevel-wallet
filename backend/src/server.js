const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const walletRouter = require("./routes/walletRoutes");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", walletRouter);

// Global error handler (basic)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).json({ message: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Connected to MongoDB");
        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

