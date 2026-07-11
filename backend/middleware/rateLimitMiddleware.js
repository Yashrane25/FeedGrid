const rateLimit = require("express-rate-limit");

//Strict limit on login/register endpoints prevents brute force password attacks
//10 requests per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15min
    max: 10,
    message: {
        success: false,
        message: "Too many authentication attempts. Please try again in 15 minutes.",
    },
    //standardHeaders: true adds RateLimit headers to responsesmso, clients know how many requests they have left
    standardHeaders: true,
    //legacyHeaders: false removes the older X-RateLimit-* headers
    legacyHeaders: false,
    //Skip rate limiting for successful requests, only count failures
    skipSuccessfulRequests: false,
});

//for normal API usage 100 requests per 10 minutes per IP
const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, //10min
    max: 100,
    message: {
        success: false,
        message:
            "Too many requests from this IP. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

//5 requests per 10 minutes per IP
const paymentLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message:
            "Too many payment attempts. Please try again in 10 minutes.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter, paymentLimiter };