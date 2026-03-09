import { createRoot } from "react-dom/client";
import "./index.css";
import "./theme.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProjectProvider } from "./context/ProjectContext";

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <ThemeProvider>
      <ProjectProvider>
        <App />
      </ProjectProvider>
    </ThemeProvider>
  </AuthProvider>,
);
