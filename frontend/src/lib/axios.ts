import axios from "axios";
import { toast } from "sonner";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 10000,
});

// Add a request interceptor for auth tokens
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh/`,
          { refresh: refreshToken }
        );

        const { access } = response.data;
        localStorage.setItem("access_token", access);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh token fails, logout the user
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response) {
      const status = error.response.status;

      if (status === 403) {
        toast.error("Access denied", {
          description: "You do not have permission to perform this action",
        });
      } else if (status === 404) {
        toast.error("Resource not found", {
          description: "The requested resource could not be found",
        });
      } else if (status === 500) {
        toast.error("Server error", {
          description: "An unexpected error occurred. Please try again later",
        });
      }
    } else if (error.request) {
      toast.error("Network error", {
        description:
          "Unable to connect to the server. Please check your internet connection",
      });
    } else {
      toast.error("Application error", {
        description: error.message,
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
