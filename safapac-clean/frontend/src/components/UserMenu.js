import React, { useState } from "react";
import {
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "shards-react";
import { FiCheck } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import { useAccess } from "../contexts/AccessContext";

const UserMenu = ({ onSettingsClick }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { logout } = useAuth();
  const { selectedAccess, availableLevels, changeAccessLevel } = useAccess();

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleAccessChange = (level) => {
    changeAccessLevel(level);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <Dropdown
      open={dropdownOpen}
      toggle={toggleDropdown}
      style={{ marginLeft: "1rem" }}
    >
      <DropdownToggle
        style={{
          background: "transparent",
          border: "none",
          padding: "0",
          cursor: "pointer",
        }}
      >
        <img
          src="/images/user/avatar.svg"
          alt="User"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "2px solid #006D7C",
          }}
        />
      </DropdownToggle>

      <DropdownMenu right style={{ minWidth: "220px", marginTop: "0.5rem" }}>
        {/* User Info - Larger font for username */}
        <DropdownItem header style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1a1a1a", padding: "0.75rem 1rem" }}>
          safapac
        </DropdownItem>

        <DropdownItem divider />

        {/* Access Level Header - Smaller, secondary */}
        <DropdownItem header style={{ fontSize: "0.7rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0.5rem 1rem" }}>
          Access Level
        </DropdownItem>

        {/* Access Level Options */}
        {availableLevels.map((level) => (
          <DropdownItem
            key={level}
            onClick={() => handleAccessChange(level)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              backgroundColor: selectedAccess === level ? "#f0f9ff" : "transparent",
            }}
          >
            <span style={{ fontWeight: selectedAccess === level ? 600 : 400, fontSize: "0.8rem", textTransform: "capitalize" }}>
              {level.toLowerCase()}
            </span>
            {selectedAccess === level && (
              <FiCheck style={{ color: "#006D7C", fontSize: "1rem" }} />
            )}
          </DropdownItem>
        ))}

        <DropdownItem divider />

        {/* Settings */}
        <DropdownItem
          onClick={onSettingsClick}
          style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
        >
          Settings
        </DropdownItem>

        {/* Logout */}
        <DropdownItem
          onClick={handleLogout}
          style={{ padding: "0.5rem 1rem", cursor: "pointer", color: "#dc2626" }}
        >
          Logout
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

export default UserMenu;
