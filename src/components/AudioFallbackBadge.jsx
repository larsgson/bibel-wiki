import React from "react";

const AudioFallbackBadge = ({ showTooltip = true, size = "small" }) => {
  const tooltip = showTooltip ? "Audio uses fallback language" : null;

  const badgeSize = size === "small" ? 24 : size === "medium" ? 32 : 40;
  const iconSize = size === "small" ? 22 : size === "medium" ? 30 : 38;
  const slashWidth = size === "small" ? 2 : size === "medium" ? 2.5 : 3;

  // Badge container styles
  const badgeStyles = {
    position: "absolute",
    top: "8px",
    right: "8px", // Same distance from right as from top
    width: `${badgeSize}px`,
    height: `${badgeSize}px`,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
    zIndex: 10,
    transition: "transform 0.2s ease",
    backgroundColor: "#ffcc00", // Yellow background
    border: "2px solid #e6b800",
  };

  // Play icon container (for positioning the slash)
  const iconContainerStyles = {
    position: "relative",
    width: `${iconSize}px`,
    height: `${iconSize}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  // Slash overlay styles
  const slashStyles = {
    position: "absolute",
    width: `${badgeSize - 8}px`,
    height: `${slashWidth}px`,
    backgroundColor: "#dc3545", // Red slash
    transform: "rotate(-45deg)",
    borderRadius: "1px",
  };

  return (
    <div
      style={badgeStyles}
      title={tooltip}
      aria-label={tooltip}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      <div style={iconContainerStyles}>
        {/* Play triangle icon - dark grey */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="#555"
          style={{ display: "block" }}
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        {/* Red diagonal slash */}
        <div style={slashStyles} />
      </div>
    </div>
  );
};

export default AudioFallbackBadge;
