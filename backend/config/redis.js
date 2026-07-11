const Redis = require("ioredis");

let redisClient = null;
let isRedisAvailable = false;

//We wrap Redis in a try and catch and availability flag
const initRedis = () => {
    try {
        redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
            retryStrategy: (times) => {
                if (times > 3) {
                    //After 3 failed attempts, stop trying and mark as unavailable
                    console.log("Redis: max retries reached, disabling cache");
                    isRedisAvailable = false;
                    return null;
                }
                //Wait 1 second between each retry attempt
                return 1000;
            },
            lazyConnect: true,
            maxRetriesPerRequest: 1,
        });

        redisClient.on("connect", () => {
            console.log("Redis connected successfully");
            isRedisAvailable = true;
        });

        redisClient.on("error", (err) => {
            if (isRedisAvailable) {
                console.error("Redis connection error:", err.message);
                console.log("App will continue without caching");
            }
            isRedisAvailable = false;
        });

        redisClient.on("close", () => {
            isRedisAvailable = false;
        });

        //Attempt connection
        // redisClient.connect().catch(() => {
        //     console.log("Redis unavailable, app running without cache");
        //     isRedisAvailable = false;
        // });
        redisClient.connect().catch((err) => {
            console.error("Redis connect failed:", err);
            isRedisAvailable = false;
        });
    }
    catch (error) {
        console.error("Redis initialization failed:", error);
        isRedisAvailable = false;
    }
};

const getCache = async (key) => {
    if (!isRedisAvailable || !redisClient) {
        return null;
    }

    try {
        const value = await redisClient.get(key);

        if (value) {
            console.log("Cache HIT:", key);
            return JSON.parse(value);
        }

        console.log("Cache MISS:", key);
        return null;
    }
    catch (error) {
        return null;
    }
};

//Set a cached value with TTL in seconds
const setCache = async (key, value, ttlSeconds = 300) => {
    if (!isRedisAvailable || !redisClient) {
        return false;
    }
    try {
        //EX sets the expiry in seconds
        await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
        return true;
    } catch (error) {
        return false;
    }
};

//Delete a specific cache key
const deleteCache = async (key) => {
    if (!isRedisAvailable || !redisClient) {
        return false;
    }
    try {
        await redisClient.del(key);
        return true;
    } catch (error) {
        return false;
    }
};

//Delete all keys matching a pattern
const deleteCachePattern = async (pattern) => {
    if (!isRedisAvailable || !redisClient) {
        return false;
    }
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(...keys);
        }
        return true;
    } catch (error) {
        return false;
    }
};

const isAvailable = () => isRedisAvailable;

module.exports = {
    initRedis,
    getCache,
    setCache,
    deleteCache,
    deleteCachePattern,
    isAvailable,
};