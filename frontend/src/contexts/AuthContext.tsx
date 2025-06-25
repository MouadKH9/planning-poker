import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import apiClient from "@/lib/axios";

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored tokens and validate them
    const token = localStorage.getItem("access_token");
    if (token) {
      validateToken();
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async () => {
    try {
      const response = await apiClient.get("/auth/profile/");
      const userData = response.data;
      setUser(userData);
      // Store user data for WebSocket authentication with timestamp
      localStorage.setItem(
        "userData",
        JSON.stringify({
          ...userData,
          timestamp: Date.now(),
        })
      );
      console.log("User validated and stored:", userData.username);
    } catch (error) {
      console.error("Token validation failed:", error);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("userData");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await apiClient.post("/auth/login/", {
        username,
        password,
      });

      const { access, refresh, user: userData } = response.data;

      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem(
        "userData",
        JSON.stringify({
          ...userData,
          timestamp: Date.now(),
        })
      );
      setUser(userData);
      console.log("User logged in:", userData.username);
    } catch (error) {
      throw new Error("Invalid credentials");
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    password2?: string
  ) => {
    try {
      const response = await apiClient.post("/auth/register/", {
        username,
        email,
        password,
        password2,
      });

      const { access, refresh, user: userData } = response.data;

      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("userData", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      throw new Error("Registration failed");
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        await apiClient.post("/auth/logout/", { refresh: refreshToken });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("userData");
      setUser(null);
      console.log("User logged out");
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
