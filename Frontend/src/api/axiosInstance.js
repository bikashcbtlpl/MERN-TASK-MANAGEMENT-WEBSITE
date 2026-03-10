import axios from "axios";

const resolveApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return `${window.location.protocol}//${window.location.hostname}:3000/api`;
  }

  try {
    const parsed = new URL(envUrl);
    const pageHost = window.location.hostname;
    const isEnvLocalhost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const isPageLocalhost =
      pageHost === "localhost" || pageHost === "127.0.0.1";

    if (isEnvLocalhost && pageHost && !isPageLocalhost) {
      parsed.hostname = pageHost;
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    return envUrl;
  }

  return envUrl;
};

const axiosInstance = axios.create({
  baseURL: resolveApiBase(),
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
