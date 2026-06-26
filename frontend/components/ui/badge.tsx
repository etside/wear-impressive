import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "outline";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  "bg-gray-100 text-gray-700",
  success:  "bg-green-50 text-green-700",
  warning:  "bg-yellow-50 text-yellow-700",
  error:    "bg-red-50 text-red-700",
  info:     "bg-blue-50 text-blue-700",
  outline:  "bg-transparent text-gray-700 border border-gray-300",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  );
}
