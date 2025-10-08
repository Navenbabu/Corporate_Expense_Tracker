import axios, { AxiosError } from "axios";

// Dynamically determine backend URL (supports Vite + .env fallback)
const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // allow cookies if backend uses them
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Attach JWT token from localStorage for every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Handle common errors & expired sessions gracefully
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const status = error.response?.status;

    if (status === 401) {
      console.warn("🔒 Session expired or invalid token");

      // clear stale auth data
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");

      // Prevent redirect loop if already on login
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    // Normalize errors for frontend use
    const message =
      (error.response?.data as any)?.message ||
      (error as any)?.message ||
      "Something went wrong";

    return Promise.reject({ ...error, message });
  }
);

export default apiClient;
