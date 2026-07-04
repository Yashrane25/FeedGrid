import API from "../api/axios";

export const getAnalytics = async (days = 7) => {
    const response = await API.get("/admin/analytics", {
        params: { days },
    });
    return response.data;
};

export const getPlatformStats = async () => {
    const response = await API.get("/admin/stats");
    return response.data;
};

export const getAllRestaurantsAdmin = async (params = {}) => {
    const response = await API.get("/admin/restaurants", { params });
    return response.data;
};

export const approveRestaurant = async (restaurantId) => {
    const response = await API.patch(
        `/restaurants/${restaurantId}/approve`
    );
    return response.data;
};

export const toggleRestaurantActive = async (restaurantId) => {
    const response = await API.patch(
        `/admin/restaurants/${restaurantId}/active`
    );
    return response.data;
};

export const getAllUsers = async (params = {}) => {
    const response = await API.get("/admin/users", { params });
    return response.data;
};

export const toggleUserActive = async (userId) => {
    const response = await API.patch(`/admin/users/${userId}/active`);
    return response.data;
};

export const updateUserRole = async (userId, role) => {
    const response = await API.patch(`/admin/users/${userId}/role`, {
        role,
    });
    return response.data;
};