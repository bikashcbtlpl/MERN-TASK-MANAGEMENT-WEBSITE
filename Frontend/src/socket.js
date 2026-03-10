import { io } from "socket.io-client";

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

const apiBase = resolveApiBase();
const socketBase = (() => {
  try {
    const url = new URL(apiBase);
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:3000";
  }
})();

const socket = io(socketBase, {
  withCredentials: true,
});

export default socket;
