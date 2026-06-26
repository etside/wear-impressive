import Link from "next/link";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  href?: string;
}

export function StatCard({ label, value, trend, trendLabel, icon, className, href }: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0;
  const content = (
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", isPositive ? "text-green-600" : "text-red-600")}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(trend)}% {trendLabel || "vs last week"}</span>
          </div>
        )}
      </div>
      {icon && (
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 shrink-0 ml-3">
          {icon}
        </div>
      )}
    </div>
  );

  const baseClass = "bg-white border border-gray-200 rounded-xl p-5";

  if (href) {
    return (
      <Link href={href} className={cn(baseClass, "block hover:border-[#2596be] hover:shadow-sm transition-all", className)}>
        {content}
      </Link>
    );
  }

  return <div className={cn(baseClass, className)}>{content}</div>;
}
