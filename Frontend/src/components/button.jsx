import React from "react";
import clsx from "clsx";

export const Button = ({ children, onClick, type = "button", variant = "primary", className = "", ...props }) => {
  const baseStyles =
    "px-4 py-2 rounded text-sm font-medium focus:outline-none transition-colors duration-200";

  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    outline: "border border-gray-300 text-gray-800 hover:bg-gray-100",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={clsx(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
