import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getReportsInitialData } from "@/lib/reports-data";
import { CostOperationReportsClient } from "@/components/reports/CostOperationReportsClient";

export const metadata = {
  title: "Fixed Fleet Cost Reports | STR-VMS",
  description: "Monthly fixed lease settlements, mileage thresholds, trip cost shares, and plant allocations.",
};

export default async function FixedFleetReportsPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  const data = await getReportsInitialData();

  return (
    <div className="w-full">
      <CostOperationReportsClient
        operationType="FIXED"
        title="Fixed Fleet Cost Analysis & Reports"
        description="Contractual monthly lease settlements, mileage limits, and trip cost shares"
        initialTrips={data.trips}
        initialRequests={data.requests}
        initialVehicles={data.vehicles}
        initialPlants={data.plants}
        dieselRate={data.dieselRate}
        currentMonth={data.currentMonth}
      />
    </div>
  );
}
