import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "../api/axios.js";

//A global container for authentication data.
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); //Stores logged in user info
  const [accessToken, setAccessToken] = useState(null); //JWT token for API calls
  const [loading, setLoading] = useState(true); //Prevent UI rendering until auth check finishes

  //Calls backend to refresh access token
  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await axios.post("/auth/refresh");

        const token = res.data.accessToken;
        setAccessToken(token);

        try {
          const base64 = token.split(".")[1];
          const payload = JSON.parse(atob(base64));

          setUser({
            id: payload.id,
            role: payload.role,
          });
        } catch (err) {
          console.error("Token decode failed", err);
          setUser(null);
        }
      } catch {
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      //axios.post(url, data)
      const res = await axios.post("/auth/login", { email, password });
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      console.error("Login failed", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await axios.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await axios.post("/auth/refresh");
      const newToken = res.data.accessToken;
      setAccessToken(newToken);
      return newToken;
    } catch (err) {
      console.error("Token refresh failed", err);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, accessToken, login, logout, loading, refreshAccessToken }}
    >
      {/* Prevents app from rendering before auth check */}
      {!loading && children}{" "}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
