import { Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import OwnerLayout from "../layouts/OwnerLayout";
import AdminLayout from "../layouts/AdminLayout";
import AgentLayout from "../layouts/AgentLayout";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import BrowsePage from "../pages/BrowsePage";
import RestaurantDetailPage from "../pages/RestaurantDetailPage";
import CheckoutPage from "../pages/CheckoutPage";
import OrderConfirmationPage from "../pages/OrderConfirmationPage";
import MyOrdersPage from "../pages/MyOrdersPage";
import OrderTrackingPage from "../pages/OrderTrackingPage";
import NotFoundPage from "../pages/NotFoundPage";
import LiveTrackingPage from "../pages/LiveTrackingPage";

import OwnerDashboard from "../pages/owner/OwnerDashboard";
import NewRestaurantPage from "../pages/owner/NewRestaurantPage";
import ManageRestaurantPage from "../pages/owner/ManageRestaurantPage";
import OwnerOrdersPage from "../pages/owner/OwnerOrdersPage";

import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminRestaurantsPage from "../pages/admin/AdminRestaurantsPage";
import AdminUsersPage from "../pages/admin/AdminUsersPage";

import AgentDashboard from "../pages/agent/AgentDashboard";
import AgentActivePage from "../pages/agent/AgentActivePage";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Customer routes */}
      <Route element={<MainLayout />}>
        <Route index path="/" element={<HomePage />} />
        <Route path="/restaurants" element={<BrowsePage />} />
        <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route
            path="/order-confirmation/:orderId"
            element={<OrderConfirmationPage />}
          />
          <Route path="/my-orders" element={<MyOrdersPage />} />
          <Route path="/orders/:orderId" element={<OrderTrackingPage />} />
          <Route path="/track/:orderId" element={<LiveTrackingPage />} />
        </Route>
      </Route>

      {/* Owner routes */}
      <Route element={<ProtectedRoute allowedRoles={["restaurant_owner"]} />}>
        <Route element={<OwnerLayout />}>
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/owner/orders" element={<OwnerOrdersPage />} />
          <Route
            path="/owner/restaurants/new"
            element={<NewRestaurantPage />}
          />
          <Route
            path="/owner/restaurants/:restaurantId"
            element={<ManageRestaurantPage />}
          />
        </Route>
      </Route>

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/restaurants" element={<AdminRestaurantsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Route>
      </Route>

      {/* Agent routes */}
      <Route element={<ProtectedRoute allowedRoles={["delivery_agent"]} />}>
        <Route element={<AgentLayout />}>
          <Route path="/agent/dashboard" element={<AgentDashboard />} />
          <Route path="/agent/active" element={<AgentActivePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
