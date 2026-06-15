import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "./RegisterPage.css";

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { default: axios } = await import("../api/axios.js");

      await axios.post("/auth/register", form);

      const user = await login(form.email, form.password);

      if (user.role === "restaurant_owner") navigate("/dashboard");
      else navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1 className="register-title">Create account</h1>

        <p className="register-subtitle">Join FeedGrid today</p>

        <form onSubmit={handleSubmit}>
          {[
            {
              key: "name",
              label: "Full Name",
              type: "text",
              placeholder: "John Doe",
            },
            {
              key: "email",
              label: "Email",
              type: "email",
              placeholder: "you@example.com",
            },
            {
              key: "password",
              label: "Password",
              type: "password",
              placeholder: "Min 6 characters",
            },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key} className="form-group">
              <label className="form-label">{label}</label>

              <input
                type={type}
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [key]: e.target.value,
                  })
                }
                required
                className="form-input"
              />
            </div>
          ))}

          <div className="role-selector">
            <label className="role-label">I am a...</label>

            <div className="role-grid">
              {[
                { value: "customer", label: "🛒 Customer" },
                { value: "restaurant_owner", label: "🍽️ Restaurant Owner" },
                { value: "delivery_agent", label: "🛵 Delivery Agent" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      role: value,
                    })
                  }
                  className={`role-btn ${
                    form.role === value ? "role-btn-active" : ""
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`submit-btn ${loading ? "submit-btn-loading" : ""}`}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="signin-text">
          Already have an account?{" "}
          <Link to="/login" className="signin-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
