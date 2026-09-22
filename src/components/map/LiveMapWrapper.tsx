"use client";

import React from "react";
import dynamic from "next/dynamic";

const LiveGisMapClient = dynamic(
  () => import("./LiveGisMapClient"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[650px] rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-xs text-gray-500">
        Loading GIS Interactive Map...
      </div>
    ),
  }
);

export function LiveMapWrapper(props: any) {
  return <LiveGisMapClient {...props} />;
}
