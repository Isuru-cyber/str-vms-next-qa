import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const s = (status || "UNKNOWN").toUpperCase();

  let colorStyle = "bg-gray-100 text-gray-700 border-gray-200";

  switch (s) {
    case "SUBMITTED":
    case "PENDING":
    case "DRAFT":
    case "UNDER REVIEW":
      colorStyle = "bg-amber-50 text-amber-700 border-amber-200";
      break;

    case "ALLOCATED":
    case "TRIP ASSIGNED":
    case "ASSIGNED":
      colorStyle = "bg-blue-50 text-blue-700 border-blue-200";
      break;

    case "READY_FOR_LOADING":
    case "READY FOR LOADING":
      colorStyle = "bg-purple-50 text-purple-700 border-purple-200";
      break;

    case "DISPATCHED":
    case "IN_TRANSIT":
    case "IN TRANSIT":
    case "STARTED":
    case "ON_TRIP":
      colorStyle = "bg-sky-50 text-sky-700 border-sky-200";
      break;

    case "COMPLETED":
    case "AVAILABLE":
    case "MATCHED":
      colorStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;

    case "CANCELLED":
    case "REJECTED":
    case "INACTIVE":
    case "UNMATCHED":
      colorStyle = "bg-rose-50 text-rose-700 border-rose-200";
      break;

    case "VARIANCE":
      colorStyle = "bg-orange-50 text-orange-700 border-orange-200";
      break;

    case "URGENT":
      colorStyle = "bg-amber-100 text-amber-800 border-amber-300 font-semibold";
      break;

    case "CRITICAL":
      colorStyle = "bg-rose-100 text-rose-800 border-rose-300 font-semibold";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide",
        colorStyle,
        className
      )}
    >
      {status || "N/A"}
    </span>
  );
};
