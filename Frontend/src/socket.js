import { io } from "socket.io-client";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
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
