import React from "react";

export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6 animate-pulse max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-96 bg-slate-100 rounded-md"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 bg-slate-200 rounded-lg"></div>
          <div className="h-10 w-36 bg-slate-200 rounded-lg"></div>
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200 rounded"></div>
              <div className="h-8 w-8 bg-slate-100 rounded-lg"></div>
            </div>
            <div className="h-7 w-20 bg-slate-300 rounded-md"></div>
            <div className="h-3 w-32 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>

      {/* Action / Filter Bar Skeleton */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="h-10 w-full sm:w-72 bg-slate-100 rounded-lg"></div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="h-10 w-32 bg-slate-100 rounded-lg"></div>
          <div className="h-10 w-32 bg-slate-100 rounded-lg"></div>
        </div>
      </div>

      {/* Table Rows Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="h-12 bg-slate-50 border-b border-slate-200 flex items-center px-6 gap-6">
          <div className="h-4 w-24 bg-slate-200 rounded"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
          <div className="h-4 w-28 bg-slate-200 rounded"></div>
          <div className="h-4 w-20 bg-slate-200 rounded"></div>
          <div className="h-4 w-24 bg-slate-200 rounded"></div>
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="px-6 py-4 flex items-center justify-between gap-6">
              <div className="flex items-center gap-3 w-1/4">
                <div className="h-8 w-8 bg-slate-100 rounded-full shrink-0"></div>
                <div className="space-y-1 w-full">
                  <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                  <div className="h-3 w-1/2 bg-slate-100 rounded"></div>
                </div>
              </div>
              <div className="h-4 w-28 bg-slate-100 rounded"></div>
              <div className="h-4 w-24 bg-slate-100 rounded"></div>
              <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
              <div className="h-8 w-20 bg-slate-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
