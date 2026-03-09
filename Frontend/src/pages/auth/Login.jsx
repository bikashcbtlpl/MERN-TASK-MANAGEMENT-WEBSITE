import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../api/axiosInstance";
import { FormField, Button } from "../../components/common";

function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post("/auth/login", formData);
      const serverUser = response.data.user || {};
      const perms = serverUser.permissions || [];
      const roleFromServer = serverUser.role || {};
      const roleName =
        typeof roleFromServer === "string"
          ? roleFromServer
          : roleFromServer.name || null;
      const rolePermissions = Array.isArray(roleFromServer.permissions)
        ? roleFromServer.permissions.map((p) =>
          typeof p === "string" ? p : p.name,
        )
        : perms;

      const normalized = {
        id: serverUser.id,
        _id: serverUser._id || serverUser.id,
        name: serverUser.name,
        email: serverUser.email,
        role: {
          name: roleName,
          permissions: rolePermissions.map((p) => ({ name: p })),
        },
        permissions: Array.isArray(perms) ? perms : rolePermissions,
        preferences: serverUser.preferences || { theme: "system", selectedProject: "" },
      };

      setUser(normalized);
      navigate("/dashboard");
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      setError(message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Login</h2>

        <form onSubmit={handleSubmit}>
          <FormField label="Email">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Password">
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <span
                className="show-password-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </span>
            </div>
          </FormField>

          {error && <p className="error-text">{error}</p>}

          <Button variant="primary" type="submit" fullWidth>
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Login;
