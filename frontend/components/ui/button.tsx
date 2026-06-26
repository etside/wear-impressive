"use client";
import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   "bg-black text-white hover:bg-gray-900",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
  ghost:     "bg-transparent text-gray-700 hover:bg-gray-100",
  danger:    "bg-red-600 text-white hover:bg-red-700",
  link:      "bg-transparent text-gray-900 underline-offset-4 hover:underline p-0 h-auto",
};

const sizeClasses: Record<Size, string> = {
  xs: "h-7 px-2.5 text-[11px] rounded",
  sm: "h-8 px-3 text-xs rounded",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-11 px-5 text-base rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer select-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "min-w-[44px] min-h-[44px]",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          size === "xs" && "min-h-[32px]",
          size === "sm" && "min-h-[36px]",
          className
        )}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
