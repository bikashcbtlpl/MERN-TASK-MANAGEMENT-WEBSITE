import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

/* ================= RESPONSE SUCCESS ================= */
axiosInstance.interceptors.response.use(
  (response) => response,

  /* ================= GLOBAL ERROR HANDLER ================= */
  (error) => {
    // 🔐 Auto logout if token expired
    if (error.response?.status === 401) {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
