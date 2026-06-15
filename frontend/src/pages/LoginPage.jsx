import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "./LoginPage.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(form.email, form.password);

      if (user.role === "restaurant_owner") navigate("/dashboard");
      else if (user.role === "delivery_agent") navigate("/");
      else navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Welcome back</h1>

        <p className="login-subtitle">Sign in to your account</p>

        <form onSubmit={handleSubmit}>
          {[
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
              placeholder: "••••••••",
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

          {error && <p className="error-message">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`submit-btn ${loading ? "submit-btn-loading" : ""}`}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="signup-text">
          Don't have an account?{" "}
          <Link to="/register" className="signup-link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
