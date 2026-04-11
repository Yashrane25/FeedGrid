import axios from "axios";

const instance = axios.create({
    baseURL: "http://localhost:5000/api",
    withCredentials: true,
});

instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const res = await instance.post("/auth/refresh");
                const newToken = res.data.accessToken;

                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return instance(originalRequest);
            } catch {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default instance;
