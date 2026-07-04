import {
  createContext, //A global storage box used to hold data like user info, token, login status.
  useContext, //Used to access the data stored in the Context box.
  useState,
  useEffect,
  useCallback, //Used to store a function and prevent it from being recreated again and again
} from "react";
import API, { setAuthToken } from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthToken(accessToken);
  }, [accessToken]);

  //Restore session on page refresh
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await API.post("/auth/refresh-token");
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
      } catch (error) {
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  //Register
  const register = useCallback(async (name, email, password, role) => {
    const res = await API.post("/auth/register", {
      name,
      email,
      password,
      role,
    });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data;
  }, []);

  //Login
  const login = useCallback(async (email, password) => {
    const res = await API.post("/auth/login", { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data;
  }, []);

  //Logout
  const logout = useCallback(async () => {
    try {
      await API.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  //Value provided to all children
  const value = {
    user,
    accessToken,
    setAccessToken,
    loading,
    register,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

//CUSTOM HOOK
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
