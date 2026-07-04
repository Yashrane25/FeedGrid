import API from "../api/axios";

//Get all orders that are ready for pickup and unassigned
export const getAvailableOrders = async () => {
    const response = await API.get("/orders/available");
    return response.data;
};

//Get the agents currently active delivery
export const getAgentActiveOrder = async () => {
    const response = await API.get("/orders/agent/active");
    return response.data;
};

//Accept an order agent takes this delivery
export const acceptOrder = async (orderId) => {
    const response = await API.patch(`/orders/${orderId}/assign-agent`);
    return response.data;
};

//Mark order as delivered
export const markDelivered = async (orderId) => {
    const response = await API.patch(`/orders/${orderId}/status`, {
        status: "delivered",
        note: "Delivered by agent",
    });
    return response.data;
};

//Send agents current GPS location to server
export const updateLocation = async (orderId, latitude, longitude) => {
    const response = await API.patch(`/orders/${orderId}/location`, {
        latitude,
        longitude,
    });
    return response.data;
};