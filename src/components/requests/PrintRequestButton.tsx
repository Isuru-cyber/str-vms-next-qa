"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintRequestButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer print:hidden"
      title="Print Request Dispatch Slip"
    >
      <Printer className="w-3.5 h-3.5 text-gray-500" />
      <span>Print Slip</span>
    </button>
  );
}
