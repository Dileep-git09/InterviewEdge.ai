import React from "react";

const VARIANTS = {
  primary:
    "text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-glow",
  accent:
    "text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-soft",
  secondary:
    "text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 shadow-soft",
  ghost:
    "text-slate-600 hover:text-indigo-700 hover:bg-indigo-50",
  dark:
    "text-white bg-slate-900 hover:bg-slate-800 shadow-soft",
};

const SIZES = {
  sm: "text-xs px-3 py-2 rounded-lg gap-1.5",
  md: "text-sm px-5 py-2.5 rounded-xl gap-2",
  lg: "text-base px-7 py-3.5 rounded-2xl gap-2.5",
};

const Button = ({
  as,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) => {
  const Component = as || "button";
  return (
    <Component
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Button;
