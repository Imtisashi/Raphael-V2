import React from 'react';

const Badge = ({ children, type = 'info' }) => {
  const styles = {
    info: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700"
  };
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${styles[type]}`}>
      {children}
    </span>
  );
};

export default Badge;
