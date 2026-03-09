import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

/* ================= RESPONSE INTERCEPTORS ================= */
axiosInstance.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";

      // Never redirect on verify — that's the normal "not logged in" response
      // Never redirect if already on the login page
      const isVerify = requestUrl.includes("/auth/verify");
      const isLoginPage = window.location.pathname === "/login";

      if (!isVerify && !isLoginPage) {
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
