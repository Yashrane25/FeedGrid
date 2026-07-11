const { getCache, setCache } = require("../config/redis");

//Parameters:
//keyFn - function that receives req and returns the cache key string. Using a function lets us build dynamic keys from URL params
//ttl - time to live in seconds (how long to cache)
const cacheMiddleware = (keyFn, ttl = 300) => {
    return async (req, res, next) => {
        try {
            //Build the cache key for this specific request
            const cacheKey = typeof keyFn === "function" ? keyFn(req) : keyFn;

            const cached = await getCache(cacheKey);

            //Cache hit return immediately without hitting the database
            if (cached) {
                console.log(`Cache HIT: ${cacheKey}`);
                return res.status(200).json({
                    ...cached,
                    fromCache: true,
                });
            }

            //Cache miss intercept res.json to cache the response before sending it
            console.log(`Cache MISS: ${cacheKey}`);

            //Store original res.json function
            const originalJson = res.json.bind(res);

            res.json = async (data) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    await setCache(cacheKey, data, ttl);
                }
                return originalJson(data);
            };

            next();
        } catch (error) {
            //If cache middleware fails, just skip caching and continue
            console.error("Cache middleware error:", error.message);
            next();
        }
    };
};

module.exports = cacheMiddleware;