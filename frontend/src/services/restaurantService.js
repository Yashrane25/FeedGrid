import API from "../api/axios";

//get all restaurant
export const getRestaurants = async (params = {}) => {
    const response = await API.get("/restaurants", { params });
    return response.data;
};

//get single restaurant with menu
export const getRestaurantById = async (id) => {
    const response = await API.get(`/restaurants/${id}`);
    return response.data;
};

//get menu items for a restaurant
export const getMenuItems = async (restaurantId, params = {}) => {
    const response = await API.get(`/restaurants/${restaurantId}/menu`, {
        params,
    });
    return response.data;
};

//get menu categories
export const getMenuCategories = async (restaurantId) => {
    const response = await API.get(
        `/restaurants/${restaurantId}/menu/categories`
    );
    return response.data;
};

export const getRestaurantReviews = async (restaurantId, params = {}) => {
    const response = await API.get(
        `/restaurants/${restaurantId}/reviews`,
        { params }
    );
    return response.data;
};