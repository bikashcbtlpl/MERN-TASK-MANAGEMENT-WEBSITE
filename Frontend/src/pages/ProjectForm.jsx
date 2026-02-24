import React, { useState, useEffect } from "react";
import Select from "react-select";
import axiosInstance from "../api/axiosInstance";

const ProjectForm = ({ onSubmit, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    name: "",
    description: "",
    deadline: "",
    status: "active",
    team: [],
  });
  const [userOptions, setUserOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const getHandle = (u) => {
    if (!u) return "user";
    if (u.username) return u.username;
    if (u.email) return u.email.split("@")[0];
    if (u.name) return u.name.replace(/\s+/g, "").toLowerCase();
    return "user";
  };

  useEffect(() => {
    axiosInstance.get("/users").then(res => {
      setUserOptions(
        res.data.map(user => ({
          label: user.name || getHandle(user),
          value: user._id,
          username: getHandle(user),
        }))
      );
    });
  }, []);

  useEffect(() => {
    if (initialData) {
      // Map team to userOptions format if needed
      setFormData({
        ...initialData,
        team: Array.isArray(initialData.team)
          ? initialData.team.map(u => ({
              label: u.name || getHandle(u),
              value: u._id,
              username: getHandle(u),
            }))
          : [],
      });
    }
  }, [initialData]);

  // Custom filter for @mention
  const filterUsers = (input) => {
    if (!input.startsWith("@")) return [];
    const search = input.slice(1).toLowerCase();
    return userOptions.filter(u => {
      const uname = (u.username || "").toLowerCase();
      return u.label.toLowerCase().startsWith(search) || uname.startsWith(search);
    });
  };

  const handleInputChange = (val) => {
    setInputValue(val);
  };

  const handleKeyDown = (e) => {
    if (e.key === " " && inputValue.startsWith("@")) {
      const matches = filterUsers(inputValue);
      if (matches.length === 1) {
        setFormData({
          ...formData,
          team: [...formData.team, matches[0]],
        });
        setInputValue("");
        e.preventDefault();
      }
    }
  };

  const handleSelectUser = (user) => {
    setFormData({
      ...formData,
      team: [...formData.team, user],
    });
    setInputValue("");
  };

  const removeTeamMember = (idx) => {
    setFormData({
      ...formData,
      team: formData.team.filter((_, i) => i !== idx),
    });
  };

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit && onSubmit(formData);
      }}
      className="project-form"
    >
      <div className="form-group">
        <label>Project Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="form-group" style={{position:'relative'}}>
        <label>Project Description</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          onKeyUp={e => {
            // Show mention dropdown if @ is typed
            if (e.key === '@') setInputValue('@');
          }}
          onInput={e => {
            // Track last word for @mention
            const val = e.target.value;
            const match = val.match(/@\w*$/);
            setInputValue(match ? match[0] : "");
          }}
        />
        {/* Dropdown for @mention in description */}
        {inputValue.startsWith("@") && (
          <div className="mention-dropdown">
                  {filterUsers(inputValue).map(user => (
              <div
                key={user.value}
                className="mention-option"
                onClick={() => {
                  // Replace @mention with username in description
                  setFormData(f => ({
                    ...f,
                        description: f.description.replace(/@\w*$/, `@${user.username} `)
                  }));
                  setInputValue("");
                }}
              >
                {user.label} <span style={{ color: '#888' }}>@{user.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="form-group">
        <label>Project Deadline</label>
        <input
          type="date"
          value={formData.deadline ? new Date(formData.deadline).toISOString().split("T")[0] : ""}
          onChange={e => setFormData({ ...formData, deadline: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>Status</label>
        <select
          value={formData.status}
          onChange={e => setFormData({ ...formData, status: e.target.value })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="form-group">
        <label>Team Assigned</label>
        <div className="team-tags">
          {formData.team.map((user, idx) => (
            <span className="team-tag" key={user.value || idx}>
              {user.label}
              <button type="button" onClick={() => removeTeamMember(idx)}>
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={inputValue}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type @ to mention user"
            style={{ minWidth: 120 }}
          />
          {/* Dropdown for @mention */}
          {inputValue.startsWith("@") && (
            <div className="mention-dropdown">
              {filterUsers(inputValue).map(user => (
                <div
                  key={user.value}
                  className="mention-option"
                  onClick={() => handleSelectUser(user)}
                >
                  {user.label} <span style={{ color: '#888' }}>@{user.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <button type="submit">Create Project</button>
    </form>
  );
};

export default ProjectForm;
