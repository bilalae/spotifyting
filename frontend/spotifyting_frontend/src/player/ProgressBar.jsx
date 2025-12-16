import React from "react";

const ProgressBar = ({ progress = 50, duration = 100, colors = { primary: "#4ade90", secondary: "#22c55e" } }) => {
  // calculate percentage
  const percentage = duration ? (progress / duration) * 100 : 50;

  return (
    <div
  style={{
    width: "100%",
    maxWidth: "500px",  // bar won’t exceed this
    height: "7px",
    backgroundColor: "#444",
    borderRadius: "10px",
    overflow: "hidden",
  }}
>

      <div
        style={{
          width: `${percentage}%`,
          height: "100%",
          background: `linear-gradient(to right, ${colors.primary}, ${colors.primary})`,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
};

export default ProgressBar;