import API from "../api/axios";

export const createPaymentIntent = async (orderData) => {
  const response = await API.post("/payments/create-intent", orderData);
  return response.data;
};

export const createOrder = async (orderData) => {
  const response = await API.post("/orders", orderData);
  return response.data;
};

export const getMyOrders = async () => {
  const response = await API.get("/orders/my");
  return response.data;
};

export const getOrderById = async (id) => {
  const response = await API.get(`/orders/${id}`);
  return response.data;
};

export const getRestaurantOrders = async (restaurantId, params = {}) => {
  const response = await API.get(
    `/orders/restaurant/${restaurantId}`,
    { params }
  );
  return response.data;
};

export const updateOrderStatus = async (orderId, status, note = "") => {
  const response = await API.patch(`/orders/${orderId}/status`, {
    status,
    note,
  });
  return response.data;
};

export const rateOrder = async (orderId, score, review) => {
  const response = await API.post(`/orders/${orderId}/rate`, {
    score,
    review,
  });
  return response.data;
};