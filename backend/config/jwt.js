/* JWT Helper Functions */

import jwt from "jsonwebtoken";

//Runs during login (creates tokens), function is called when user logs in successfully.
export const generateTokens = (res, userId, role) => {
    //jwt.sign(payload, secret, options)
    //Embed userId and role so any middleware can know who is making the request without hitting the database every time.

    const accessToken = jwt.sign(
        { id: userId, role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        { id: userId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );

    //Set refresh token as an httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, //7 days in milliseconds
    });

    return { accessToken, refreshToken };
}


//runs on protected routes (checks user)
export const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};
