import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getPlatformStats, getAnalytics } from "../../services/adminService";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import "./AdminDashboard.css";

const STATUS_COLORS = {
  placed: "#1565c0",
  confirmed: "#2e7d32",
  preparing: "#e65100",
  ready_for_pickup: "#6a1b9a",
  out_for_delivery: "#006064",
  delivered: "#1b5e20",
  cancelled: "#b71c1c",
};

const PIE_COLORS = [
  "#e85d04",
  "#1565c0",
  "#2e7d32",
  "#6a1b9a",
  "#006064",
  "#e65100",
  "#b71c1c",
];

//stat card
const StatCard = ({ label, value, icon, colorClass, sub }) => (
  <div className={`admin-stat-card admin-stat-card--${colorClass}`}>
    <div className="admin-stat-card__icon">{icon}</div>
    <div className="admin-stat-card__content">
      <div className="admin-stat-card__value">{value}</div>
      <div className="admin-stat-card__label">{label}</div>
      {sub && <div className="admin-stat-card__sub">{sub}</div>}
    </div>
  </div>
);

//custom tooltip
const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip__row">
          <span
            className="chart-tooltip__dot"
            style={{ background: p.color }}
          />
          <span>{p.name}:</span>
          <strong>
            {p.name === "Revenue"
              ? `₹${p.value.toLocaleString("en-IN")}`
              : p.value}
          </strong>
        </div>
      ))}
    </div>
  );
};

//main component
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDays, setSelectedDays] = useState(7);

  const fetchData = async (days = 7) => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, analyticsData] = await Promise.all([
        getPlatformStats(),
        getAnalytics(days),
      ]);

      setStats(statsData.stats);
      setRecentOrders(statsData.recentOrders || []);
      setAnalytics(analyticsData.analytics);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDays);
  }, [selectedDays]);

  if (loading) return <LoadingSpinner message="Loading analytics..." />;
  if (error)
    return (
      <ErrorMessage message={error} onRetry={() => fetchData(selectedDays)} />
    );

  const summary = analytics?.summary || {};

  return (
    <div className="admin-dashboard">
      {/* Page header */}
      <div className="admin-dashboard__header">
        <div>
          <h1 className="admin-dashboard__title">Analytics Dashboard</h1>
          <p className="admin-dashboard__subtitle">
            Platform performance overview
          </p>
        </div>

        {/* Day range selector */}
        <div className="admin-dashboard__range-selector">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              className={`range-btn ${
                selectedDays === d ? "range-btn--active" : ""
              }`}
              onClick={() => setSelectedDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Pending approval alert */}
      {stats?.pendingRestaurants > 0 && (
        <div className="admin-dashboard__alert">
          <span>
            ⏳ <strong>{stats.pendingRestaurants} restaurant(s)</strong> waiting
            for approval
          </span>
          <a
            href="/admin/restaurants?status=pending"
            className="admin-dashboard__alert-link"
          >
            Review now →
          </a>
        </div>
      )}

      {/* Period summary cards */}
      <div className="admin-dashboard__period-summary">
        <div className="period-card">
          <div className="period-card__value">
            ₹{summary.periodRevenue?.toLocaleString("en-IN") || 0}
          </div>
          <div className="period-card__label">
            Revenue (last {selectedDays}d)
          </div>
        </div>
        <div className="period-card">
          <div className="period-card__value">{summary.periodOrders || 0}</div>
          <div className="period-card__label">
            Orders (last {selectedDays}d)
          </div>
        </div>
        <div className="period-card">
          <div className="period-card__value">
            ₹{summary.avgOrderValue || 0}
          </div>
          <div className="period-card__label">Avg Order Value</div>
        </div>
      </div>

      {/* Main stat cards */}
      <div className="admin-dashboard__stats-grid">
        <StatCard
          icon="👥"
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          colorClass="blue"
          sub={`${stats?.totalCustomers ?? 0} customers`}
        />
        <StatCard
          icon="🏪"
          label="Restaurants"
          value={stats?.totalRestaurants ?? 0}
          colorClass="green"
          sub={`${stats?.pendingRestaurants ?? 0} pending`}
        />
        <StatCard
          icon="📦"
          label="Total Orders"
          value={stats?.totalOrders ?? 0}
          colorClass="orange"
          sub={`${stats?.deliveredOrders ?? 0} delivered`}
        />
        <StatCard
          icon="💰"
          label="Total Revenue"
          value={`₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`}
          colorClass="purple"
          sub="All time"
        />
        <StatCard
          icon="🛵"
          label="Delivery Agents"
          value={stats?.totalAgents ?? 0}
          colorClass="teal"
        />
        <StatCard
          icon="🏆"
          label="Restaurant Owners"
          value={stats?.totalOwners ?? 0}
          colorClass="amber"
        />
      </div>

      {/* Charts row 1 */}
      <div className="admin-dashboard__charts-row">
        {/* Revenue line chart */}
        <div className="chart-card chart-card--wide">
          <div className="chart-card__header">
            <div className="chart-card__title">
              Revenue (last {selectedDays} days)
            </div>
          </div>
          <div className="chart-card__body">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={analytics?.dailyData || []}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#888" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#888" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#e85d04"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#e85d04" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders bar chart */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__title">Orders per Day</div>
          </div>
          <div className="chart-card__body">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={analytics?.dailyData || []}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#888" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#888" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Bar
                  dataKey="orders"
                  name="Orders"
                  fill="#1565c0"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="admin-dashboard__charts-row">
        {/* Order status pie chart */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__title">Order Status Breakdown</div>
          </div>
          <div className="chart-card__body">
            {analytics?.statusData?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={analytics.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {analytics.statusData.map((entry, index) => (
                      <Cell
                        key={entry.status}
                        fill={
                          STATUS_COLORS[entry.status] ||
                          PIE_COLORS[index % PIE_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ fontSize: "0.75rem", color: "#555" }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-card__empty">No order data yet</div>
            )}
          </div>
        </div>

        {/* Top restaurants */}
        <div className="chart-card chart-card--wide">
          <div className="chart-card__header">
            <div className="chart-card__title">Top Restaurants by Revenue</div>
          </div>
          <div className="chart-card__body">
            {analytics?.topRestaurants?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  layout="vertical"
                  data={analytics.topRestaurants}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#888" }}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `₹${v / 1000}k` : `₹${v}`
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#555" }}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `₹${value.toLocaleString("en-IN")}`,
                      "Revenue",
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#2e7d32" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-card__empty">No delivered orders yet</div>
            )}
          </div>
        </div>
      </div>

      {/* New users chart */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div className="chart-card__title">New User Registrations</div>
        </div>
        <div className="chart-card__body">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={analytics?.dailyData || []}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#888" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#888" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<RevenueTooltip />} />
              <Bar
                dataKey="newUsers"
                name="New Users"
                fill="#6a1b9a"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders table */}
      {recentOrders.length > 0 && (
        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__title">Recent Orders</div>
          </div>
          <div className="admin-dashboard__orders-table">
            <div className="orders-table__header">
              <span>Customer</span>
              <span>Restaurant</span>
              <span>Status</span>
              <span>Total</span>
            </div>
            {recentOrders.map((order) => {
              const sc = STATUS_COLORS[order.status] || STATUS_COLORS.placed;
              return (
                <div key={order._id} className="orders-table__row">
                  <span className="orders-table__cell">
                    {order.customer?.name || "—"}
                  </span>
                  <span className="orders-table__cell orders-table__cell--muted">
                    {order.restaurant?.name || "—"}
                  </span>
                  <span>
                    <span
                      className="orders-table__badge"
                      style={{
                        background: sc + "22",
                        color: sc,
                      }}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </span>
                  <span className="orders-table__cell--bold">
                    ₹{order.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
