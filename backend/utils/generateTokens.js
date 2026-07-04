const jwt = require("jsonwebtoken");

const generateAccessToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role: role },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRE || "15m",
        }
    );
};


const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
        }
    );
};

//SEND TOKENS TO CLIENT
const sendTokenResponse = async (user, statusCode, res) => {
    //Generate both tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    //Cookie options
    const cookieOptions = {
        httpOnly: true,
        //secure: true — cookie only sent over HTTPS
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,  //7 days = 7 * 24 * 60 * 60 * 1000
    };

    //Send the response
    res
        .status(statusCode)
        //Set the HttpOnly cookie with the refresh token
        .cookie("refreshToken", refreshToken, cookieOptions)
        //Send the access token and user data in the JSON body
        .json({
            success: true,
            accessToken,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address,
                avatar: user.avatar,
                isActive: user.isActive,
            },
        });
};

module.exports = { generateAccessToken, generateRefreshToken, sendTokenResponse };