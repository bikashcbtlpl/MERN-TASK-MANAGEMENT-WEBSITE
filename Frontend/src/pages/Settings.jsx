import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

function Settings() {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const isSuperAdmin = storedUser?.role === "Super Admin";

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [emailConfig, setEmailConfig] = useState({
    smtpHost: "",
    smtpPort: "",
    senderEmail: "",
  });

  const [security, setSecurity] = useState({
    minPasswordLength: 6,
    enableRegistration: true,
    sessionTimeout: 30,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const res = await axiosInstance.get("/settings");

    setProfile({
      name: res.data.profile.name,
      email: res.data.profile.email,
      password: "",
    });

    if (isSuperAdmin) {
      setEmailConfig(res.data.emailConfig);
      setSecurity(res.data.security);
    }
  };

  // ================= PROFILE SAVE =================
  const handleProfileSave = async () => {
    await axiosInstance.put("/settings/profile", {
      name: profile.name,
      password: profile.password,
    });

    // Update localStorage user immediately
    const updatedUser = {
      ...storedUser,
      name: profile.name,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));

    // Trigger Topbar update instantly
    window.dispatchEvent(new Event("storage"));

    alert("Profile Updated");

    // Clear password field
    setProfile({ ...profile, password: "" });
  };

  // ================= EMAIL SAVE =================
  const handleEmailSave = async () => {
    if (!isSuperAdmin) return;

    await axiosInstance.put("/settings/email", emailConfig);
    alert("Email Settings Updated");
  };

  // ================= SECURITY SAVE =================
  const handleSecuritySave = async () => {
    if (!isSuperAdmin) return;

    await axiosInstance.put("/settings/security", security);
    alert("Security Settings Updated");
  };

  return (
    <div className="settings-container">

      {/* ================= PROFILE ================= */}
      <div className="settings-card">
        <h3>Profile Settings</h3>

        <div className="form-group">
          <label>Name</label>
          <input
            value={profile.name}
            onChange={(e) =>
              setProfile({ ...profile, name: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input value={profile.email} disabled />
        </div>

        <div className="form-group">
          <label>New Password</label>
          <input
            type="password"
            value={profile.password}
            onChange={(e) =>
              setProfile({ ...profile, password: e.target.value })
            }
          />
        </div>

        <button className="save-btn" onClick={handleProfileSave}>
          Save Profile
        </button>
      </div>

      {/* ================= EMAIL (SUPER ADMIN ONLY) ================= */}
      {isSuperAdmin && (
        <div className="settings-card">
          <h3>Email Settings</h3>

          <div className="form-group">
            <label>SMTP Host</label>
            <input
              value={emailConfig.smtpHost}
              onChange={(e) =>
                setEmailConfig({
                  ...emailConfig,
                  smtpHost: e.target.value,
                })
              }
            />
          </div>

          <div className="form-group">
            <label>SMTP Port</label>
            <input
              value={emailConfig.smtpPort}
              onChange={(e) =>
                setEmailConfig({
                  ...emailConfig,
                  smtpPort: e.target.value,
                })
              }
            />
          </div>

          <div className="form-group">
            <label>Sender Email</label>
            <input
              value={emailConfig.senderEmail}
              onChange={(e) =>
                setEmailConfig({
                  ...emailConfig,
                  senderEmail: e.target.value,
                })
              }
            />
          </div>

          <button className="save-btn" onClick={handleEmailSave}>
            Save Email Settings
          </button>
        </div>
      )}

      {/* ================= SECURITY (SUPER ADMIN ONLY) ================= */}
      {isSuperAdmin && (
        <div className="settings-card">
          <h3>Security Settings</h3>

          <div className="form-group">
            <label>Minimum Password Length</label>
            <input
              type="number"
              value={security.minPasswordLength}
              onChange={(e) =>
                setSecurity({
                  ...security,
                  minPasswordLength: e.target.value,
                })
              }
            />
          </div>

          <div className="form-group">
            <label>Session Timeout (minutes)</label>
            <input
              type="number"
              value={security.sessionTimeout}
              onChange={(e) =>
                setSecurity({
                  ...security,
                  sessionTimeout: e.target.value,
                })
              }
            />
          </div>

          <button className="save-btn" onClick={handleSecuritySave}>
            Save Security Settings
          </button>
        </div>
      )}
    </div>
  );
}

export default Settings;
