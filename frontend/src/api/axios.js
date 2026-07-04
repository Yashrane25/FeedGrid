import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
    withCredentials: true,
});

//request interceptor runs before every request is sent
let currentAccessToken = null;

//This function is called by AuthContext to keep the interceptor in sync
export const setAuthToken = (token) => {
    currentAccessToken = token;
};

API.interceptors.request.use(
    (config) => {
        if (currentAccessToken) {
            config.headers.Authorization = `Bearer ${currentAccessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

//response interceptor runs after every response is received
let isRefreshing = false;

let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });
    failedQueue = [];
};

API.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes("/auth/refresh-token") &&
            !originalRequest.url.includes("/auth/login") &&
            !originalRequest.url.includes("/auth/register")
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return API(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }
            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const res = await API.post("/auth/refresh-token");
                const newToken = res.data.accessToken;
                currentAccessToken = newToken;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                processQueue(null, newToken);
                return API(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                currentAccessToken = null;

                window.location.href = "/login";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export default API;