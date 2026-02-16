import axios from "axios";
import { toast } from "react-toastify";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

/* ================= RESPONSE SUCCESS ================= */
axiosInstance.interceptors.response.use(
  (response) => response,

  /* ================= GLOBAL ERROR HANDLER ================= */
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";

    // 🔥 Show toast automatically
    toast.error(message);

    // 🔐 Auto logout if token expired
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
