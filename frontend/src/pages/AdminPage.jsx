import { useState, useEffect, useCallback } from "react";
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
import axios from "../api/axios.js";
import "./AdminPage.css";

//Colour palette used across all charts
const COLORS = [
  "#e23744",
  "#1976d2",
  "#388e3c",
  "#f59f00",
  "#7b1fa2",
  "#888780",
];

//Small reusable stat card
function StatCard({ icon, label, value, sub, color = "#e23744" }) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon" style={{ background: `${color}18` }}>
        {icon}
      </div>
      <div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
        {sub && (
          <div
            className={`stat-card__sub ${sub.startsWith("+") ? "stat-card__sub--positive" : sub.startsWith("-") ? "stat-card__sub--negative" : "stat-card__sub--neutral"}`}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

//Section wrapper
function Section({ title, children, action }) {
  return (
    <div className="section">
      <div className="section__header">
        <h2 className="section__title">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

//Tab bar
function TabBar({ tabs, active, onChange }) {
  return (
    <div className="tab-bar">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`tab-bar__btn ${active === t.key ? "tab-bar__btn--active" : ""}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

//Main Admin Page component
export default function AdminPage() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartDays, setChartDays] = useState(30);
  const [topRests, setTopRests] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [users, setUsers] = useState([]);
  const [userTrend, setUserTrend] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");

  //Fetch overview data on mount
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [statsRes, topRes] = await Promise.all([
          axios.get("/admin/stats"),
          axios.get("/admin/top-restaurants?limit=5"),
        ]);
        setStats(statsRes.data);
        setTopRests(topRes.data.data);
      } catch (error) {
        console.error("Failed to load admin stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  //Fetch revenue chart when days changes
  useEffect(() => {
    const fetchChart = async () => {
      try {
        const res = await axios.get(`/admin/revenue-chart?days=${chartDays}`);
        setChartData(res.data.data);
      } catch (error) {
        console.error("Failed to load chart data:", error);
      }
    };
    fetchChart();
  }, [chartDays]);

  //Fetch tab-specific data when tab changes
  useEffect(() => {
    const fetchTabData = async () => {
      try {
        if (tab === "restaurants") {
          const res = await axios.get("/admin/restaurants");
          setRestaurants(res.data.restaurants);
        } else if (tab === "users") {
          const [usersRes, trendRes] = await Promise.all([
            axios.get(
              `/admin/users${userRoleFilter ? `?role=${userRoleFilter}` : ""}`,
            ),
            axios.get("/admin/users/trend"),
          ]);
          setUsers(usersRes.data.users);
          setUserTrend(trendRes.data.data);
        } else if (tab === "orders") {
          const res = await axios.get(
            `/admin/orders${orderStatusFilter ? `?status=${orderStatusFilter}` : ""}`,
          );
          setOrders(res.data.orders);
        }
      } catch (error) {
        console.error("Tab data fetch error:", error);
      }
    };
    fetchTabData();
  }, [tab, userRoleFilter, orderStatusFilter]);

  const handleToggleRestaurant = async (id) => {
    try {
      const res = await axios.patch(`/admin/restaurants/${id}/toggle`);
      setRestaurants((prev) =>
        prev.map((r) =>
          r._id === id ? { ...r, isActive: res.data.isActive } : r,
        ),
      );
    } catch (error) {
      console.log(error);
      alert("Failed to update restaurant status.");
    }
  };

  const handleToggleBan = async (id) => {
    try {
      const res = await axios.patch(`/admin/users/${id}/ban`);
      setUsers((prev) =>
        prev.map((u) =>
          u._id === id ? { ...u, isBanned: res.data.isBanned } : u,
        ),
      );
    } catch (error) {
      console.log(error);
      alert("Failed to update user status.");
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading__icon">⏳</div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  const STATUS_PIE_DATA = stats
    ? Object.entries(stats.ordersByStatus).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  return (
    <div className="admin-page">
      {/* Page header */}
      <div className="admin-page__header">
        <h1 className="admin-page__title">Admin Panel</h1>
        <p className="admin-page__subtitle">FoodRush platform overview</p>
      </div>

      {/* Tab navigation */}
      <TabBar
        tabs={[
          { key: "overview", label: "📊 Overview" },
          { key: "restaurants", label: "🍽️ Restaurants" },
          { key: "users", label: "👥 Users" },
          { key: "orders", label: "📦 Orders" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* TAB: OVERVIEW */}
      {tab === "overview" && stats && (
        <>
          {/* Stat cards row */}
          <div className="stat-grid">
            <StatCard
              icon="👥"
              label="Total Users"
              value={stats.stats.totalUsers.toLocaleString()}
              color="#1976d2"
            />
            <StatCard
              icon="🍽️"
              label="Active Restaurants"
              value={stats.stats.totalRestaurants.toLocaleString()}
              color="#388e3c"
            />
            <StatCard
              icon="📦"
              label="Total Orders"
              value={stats.stats.totalOrders.toLocaleString()}
              color="#f59f00"
            />
            <StatCard
              icon="📆"
              label="Today's Orders"
              value={stats.stats.todayOrders.toLocaleString()}
              color="#7b1fa2"
            />
            <StatCard
              icon="💰"
              label="This Month Revenue"
              value={`₹${stats.stats.monthRevenue.toLocaleString()}`}
              sub={`${stats.stats.revenueGrowth >= 0 ? "+" : ""}${stats.stats.revenueGrowth}% vs last month`}
              color="#e23744"
            />
          </div>

          {/* Revenue chart + Order status pie side by side */}
          <div className="chart-grid">
            {/* Revenue line chart */}
            <Section
              title="Revenue"
              action={
                <div className="day-filter">
                  {[7, 30, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setChartDays(d)}
                      className={`day-filter__btn ${chartDays === d ? "day-filter__btn--active" : ""}`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              }
            >
              {chartData.length === 0 ? (
                <div className="chart-empty" style={{ height: "200px" }}>
                  No revenue data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                    {/* dataKey="date" uses the "date" field from our data objects */}
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(d) => d.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "revenue"
                          ? `₹${value.toLocaleString()}`
                          : value,
                        name === "revenue" ? "Revenue" : "Orders",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#e23744"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* Order status pie chart */}
            <Section title="Order Status">
              {STATUS_PIE_DATA.length === 0 ? (
                <div className="chart-empty" style={{ height: "200px" }}>
                  No orders yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={STATUS_PIE_DATA}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {STATUS_PIE_DATA.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Section>
          </div>

          {/* Top restaurants bar chart */}
          <Section title="Top Restaurants by Revenue">
            {topRests.length === 0 ? (
              <div className="chart-empty" style={{ height: "180px" }}>
                No restaurant data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={topRests}
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(n) =>
                      n.length > 12 ? `${n.slice(0, 12)}…` : n
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `₹${value.toLocaleString()}`,
                      "Revenue",
                    ]}
                  />
                  <Bar dataKey="totalRevenue" radius={[6, 6, 0, 0]}>
                    {topRests.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* Recent orders table */}
          <Section title="Recent Orders">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr className="data-table__head-row">
                    {[
                      "Order ID",
                      "Customer",
                      "Restaurant",
                      "Amount",
                      "Status",
                      "Date",
                    ].map((h) => (
                      <th key={h} className="data-table__th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(stats.recentOrders || []).map((order) => (
                    <tr key={order._id} className="data-table__row">
                      <td className="data-table__td data-table__td--mono">
                        #{order._id.slice(-8).toUpperCase()}
                      </td>
                      <td className="data-table__td">
                        {order.customer?.name || "—"}
                      </td>
                      <td className="data-table__td">
                        {order.restaurant?.name || "—"}
                      </td>
                      <td className="data-table__td data-table__td--bold">
                        ₹{order.totalAmount}
                      </td>
                      <td className="data-table__td">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="data-table__td data-table__td--muted">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      {/* TAB: RESTAURANT */}
      {tab === "restaurants" && (
        <Section title={`All Restaurants (${restaurants.length})`}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr className="data-table__head-row">
                  {[
                    "Restaurant",
                    "Owner",
                    "Cuisine",
                    "Orders",
                    "Revenue",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th key={h} className="data-table__th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {restaurants.map((r) => (
                  <tr key={r._id} className="data-table__row">
                    <td className="data-table__td">
                      <div className="rest-cell">
                        {r.image && (
                          <img
                            src={r.image}
                            alt={r.name}
                            className="rest-cell__img"
                          />
                        )}
                        <div>
                          <div className="rest-cell__name">{r.name}</div>
                          <div className="rest-cell__city">
                            {r.address?.city}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="data-table__td">
                      <div>{r.owner?.name}</div>
                      <div className="data-table__td--muted">
                        {r.owner?.email}
                      </div>
                    </td>
                    <td className="data-table__td data-table__td--muted">
                      {r.cuisine?.slice(0, 2).join(", ")}
                    </td>
                    <td className="data-table__td data-table__td--bold">
                      {r.orderCount}
                    </td>
                    <td className="data-table__td data-table__td--revenue">
                      ₹{r.totalRevenue?.toLocaleString()}
                    </td>
                    <td className="data-table__td">
                      <span
                        className={`status-pill ${r.isActive ? "status-pill--active" : "status-pill--inactive"}`}
                      >
                        {r.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="data-table__td">
                      <button
                        onClick={() => handleToggleRestaurant(r._id)}
                        className={`action-btn ${r.isActive ? "action-btn--deactivate" : "action-btn--activate"}`}
                      >
                        {r.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* TAB: USERS */}
      {tab === "users" && (
        <>
          {/* User registration trend chart */}
          <Section title="New Registrations (Last 30 Days)">
            {userTrend.length === 0 ? (
              <div className="chart-empty" style={{ height: "160px" }}>
                No registration data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={userTrend}
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, "New Users"]} />
                  <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* Users table */}
          <Section
            title={`Users (${users.length})`}
            action={
              <div className="role-filter">
                {["", "customer", "restaurant_owner", "delivery_agent"].map(
                  (r) => (
                    <button
                      key={r}
                      onClick={() => setUserRoleFilter(r)}
                      className={`role-filter__btn ${userRoleFilter === r ? "role-filter__btn--active" : ""}`}
                    >
                      {r || "All"}
                    </button>
                  ),
                )}
              </div>
            }
          >
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr className="data-table__head-row">
                    {[
                      "Name",
                      "Email",
                      "Role",
                      "Joined",
                      "Status",
                      "Action",
                    ].map((h) => (
                      <th key={h} className="data-table__th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u._id}
                      className="data-table__row"
                      style={{ opacity: u.isBanned ? 0.5 : 1 }}
                    >
                      <td className="data-table__td data-table__td--bold">
                        {u.name}
                      </td>
                      <td className="data-table__td data-table__td--muted">
                        {u.email}
                      </td>
                      <td className="data-table__td">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="data-table__td data-table__td--muted">
                        {new Date(u.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="data-table__td">
                        <span
                          className={`status-pill ${u.isBanned ? "status-pill--inactive" : "status-pill--active"}`}
                        >
                          {u.isBanned ? "Banned" : "Active"}
                        </span>
                      </td>
                      <td className="data-table__td">
                        {u.role !== "admin" && (
                          <button
                            onClick={() => handleToggleBan(u._id)}
                            className={`action-btn ${u.isBanned ? "action-btn--activate" : "action-btn--deactivate"}`}
                          >
                            {u.isBanned ? "Unban" : "Ban"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      {/* TAB: ORDERS */}
      {tab === "orders" && (
        <Section
          title={`All Orders (${orders.length})`}
          action={
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="status-select"
            >
              <option value="">All statuses</option>
              {[
                "pending",
                "confirmed",
                "preparing",
                "out_for_delivery",
                "delivered",
                "cancelled",
              ].map((s) => (
                <option key={s} value={s}>
                  {s
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          }
        >
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr className="data-table__head-row">
                  {[
                    "Order ID",
                    "Customer",
                    "Restaurant",
                    "Items",
                    "Amount",
                    "Status",
                    "Date",
                  ].map((h) => (
                    <th key={h} className="data-table__th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="data-table__row">
                    <td className="data-table__td data-table__td--mono">
                      #{order._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="data-table__td">{order.customer?.name}</td>
                    <td className="data-table__td">{order.restaurant?.name}</td>
                    <td className="data-table__td data-table__td--muted">
                      {order.items?.length} item
                      {order.items?.length !== 1 ? "s" : ""}
                    </td>
                    <td className="data-table__td data-table__td--bold">
                      ₹{order.totalAmount}
                    </td>
                    <td className="data-table__td">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="data-table__td data-table__td--muted">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

//Small helper badge components
function StatusBadge({ status }) {
  const MAP = {
    pending: { bg: "#fff8e1", color: "#f59f00" },
    confirmed: { bg: "#e8f5e9", color: "#388e3c" },
    preparing: { bg: "#e3f2fd", color: "#1976d2" },
    out_for_delivery: { bg: "#f3e5f5", color: "#7b1fa2" },
    delivered: { bg: "#e8f5e9", color: "#388e3c" },
    cancelled: { bg: "#ffebee", color: "#c62828" },
  };
  const style = MAP[status] || { bg: "#f5f5f5", color: "#888" };
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "99px",
        fontSize: "12px",
        fontWeight: "600",
        background: style.bg,
        color: style.color,
      }}
    >
      {status?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

function RoleBadge({ role }) {
  const MAP = {
    customer: { bg: "#e3f2fd", color: "#1976d2" },
    restaurant_owner: { bg: "#fff8e1", color: "#f59f00" },
    delivery_agent: { bg: "#f3e5f5", color: "#7b1fa2" },
    admin: { bg: "#ffebee", color: "#c62828" },
  };
  const style = MAP[role] || { bg: "#f5f5f5", color: "#888" };
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "99px",
        fontSize: "12px",
        fontWeight: "600",
        background: style.bg,
        color: style.color,
      }}
    >
      {role?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}
