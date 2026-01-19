import React from "react";
import useTranslation from "../hooks/useTranslation";
import { getAvailabilityIcon } from "../utils/storyAvailability";

const AvailabilityBadge = ({ status, showTooltip = true, size = "small" }) => {
  const { t } = useTranslation();

  // IMPORTANT: Only show badge for partial, empty, or missing content
  if (!status || status === "unknown" || status === "full") {
    return null;
  }

  const icon = getAvailabilityIcon(status);
  const tooltipKey = `availabilityBadge.${status}Tooltip`;
  const tooltip = showTooltip ? t(tooltipKey) : null;

  // Determine colors based on status
  const isPartial = status === "partial";
  const backgroundColor = isPartial ? "#f0ad4e" : "#dc3545"; // Yellow for partial, red for empty/missing
  const borderColor = isPartial ? "#d99a3e" : "#bd2130";

  // Badge styles - inline to avoid CSS file dependency
  const badgeStyles = {
    position: "absolute",
    top: "8px",
    right: "8px",
    width: size === "small" ? "24px" : size === "medium" ? "32px" : "40px",
    height: size === "small" ? "24px" : size === "medium" ? "32px" : "40px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: size === "small" ? "14px" : size === "medium" ? "18px" : "22px",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
    zIndex: 10,
    transition: "transform 0.2s ease",
    backgroundColor,
    color: "white",
    border: `2px solid ${borderColor}`,
  };

  return (
    <div
      style={badgeStyles}
      title={tooltip}
      aria-label={tooltip}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {icon}
    </div>
  );
};

export default AvailabilityBadge;
