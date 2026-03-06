import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";
import { FormField, Button, FeedbackMessage } from "../../components/common";
import { useAuth } from "../../context/AuthContext";
import { isSuperAdmin as checkSuperAdmin } from "../../permissions/can";

function Settings() {
  const { user, setUser } = useAuth();
  const isSuperAdmin = checkSuperAdmin(user);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  });
  const [emailConfig, setEmailConfig] = useState({
    smtpHost: "",
    smtpPort: "",
    senderEmail: "",
  });
  const [security, setSecurity] = useState({
    minPasswordLength: 6,
    enableRegistration: true,
  });
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/settings");
      setProfile({
        name: res.data.profile.name,
        email: res.data.profile.email,
        currentPassword: "",
        newPassword: "",
      });
      if (isSuperAdmin) {
        setEmailConfig(res.data.emailConfig);
        setSecurity(res.data.security);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Unable to load settings",
      });
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleProfileSave = async () => {
    try {
      await axiosInstance.put("/settings/profile", {
        name: profile.name,
        currentPassword: profile.currentPassword,
        newPassword: profile.newPassword,
      });

      if (user) {
        const updatedUser = { ...user, name: profile.name };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event("storage"));
      }

      setFeedback({ type: "success", message: "Profile updated" });
      setProfile((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Profile update failed",
      });
    }
  };

  const handleEmailSave = async () => {
    if (!isSuperAdmin) return;
    try {
      await axiosInstance.put("/settings/email", emailConfig);
      setFeedback({ type: "success", message: "Email settings updated" });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Email settings update failed",
      });
    }
  };

  const handleSecuritySave = async () => {
    if (!isSuperAdmin) return;
    try {
      await axiosInstance.put("/settings/security", security);
      setFeedback({ type: "success", message: "Security settings updated" });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message || "Security settings update failed",
      });
    }
  };

  return (
    <div className="settings-container">
      <FeedbackMessage
        type={feedback.type}
        message={feedback.message}
        onClose={() => setFeedback({ type: "", message: "" })}
      />

      {/* PROFILE */}
      <div className="settings-card">
        <h3>Profile Settings</h3>

        <FormField label="Name">
          <input
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </FormField>

        <FormField label="Email">
          <input value={profile.email} disabled />
        </FormField>

        <FormField label="Current Password">
          <input
            type="password"
            value={profile.currentPassword}
            onChange={(e) =>
              setProfile({ ...profile, currentPassword: e.target.value })
            }
          />
        </FormField>

        <FormField label="New Password">
          <input
            type="password"
            value={profile.newPassword}
            onChange={(e) =>
              setProfile({ ...profile, newPassword: e.target.value })
            }
          />
        </FormField>

        <Button variant="primary" onClick={handleProfileSave}>
          Save Profile
        </Button>
      </div>

      {/* EMAIL (SUPER ADMIN ONLY) */}
      {isSuperAdmin && (
        <div className="settings-card">
          <h3>Email Settings</h3>

          <FormField label="SMTP Host">
            <input
              value={emailConfig.smtpHost}
              onChange={(e) =>
                setEmailConfig({ ...emailConfig, smtpHost: e.target.value })
              }
            />
          </FormField>

          <FormField label="SMTP Port">
            <input
              value={emailConfig.smtpPort}
              onChange={(e) =>
                setEmailConfig({ ...emailConfig, smtpPort: e.target.value })
              }
            />
          </FormField>

          <FormField label="Sender Email">
            <input
              value={emailConfig.senderEmail}
              onChange={(e) =>
                setEmailConfig({ ...emailConfig, senderEmail: e.target.value })
              }
            />
          </FormField>

          <Button variant="primary" onClick={handleEmailSave}>
            Save Email Settings
          </Button>
        </div>
      )}

      {/* SECURITY (SUPER ADMIN ONLY) */}
      {isSuperAdmin && (
        <div className="settings-card">
          <h3>Security Settings</h3>

          <FormField label="Minimum Password Length">
            <input
              type="number"
              value={security.minPasswordLength}
              onChange={(e) =>
                setSecurity({ ...security, minPasswordLength: e.target.value })
              }
            />
          </FormField>

          <Button variant="primary" onClick={handleSecuritySave}>
            Save Security Settings
          </Button>
        </div>
      )}
    </div>
  );
}

export default Settings;
