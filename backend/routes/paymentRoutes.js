const express = require("express");
const router = express.Router();
const { createPaymentIntent } = require("../controllers/paymentController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

//POST /api/payments/create-intent
router.post(
    "/create-intent",
    protect,
    restrictTo("customer"),
    createPaymentIntent
);

module.exports = router;