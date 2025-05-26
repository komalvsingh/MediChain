import React from "react";

export const Dialog = ({ open, onClose, title, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="fixed inset-0 bg-black bg-opacity-40"
        onClick={onClose}
      />
      <div className="bg-white p-6 rounded-lg shadow-lg z-50 w-full max-w-md relative">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <div>{children}</div>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
        >
          ✖
        </button>
      </div>
    </div>
  );
};

export default Dialog;
