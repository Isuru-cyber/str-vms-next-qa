import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getReportsInitialData } from "@/lib/reports-data";
import { CostOperationReportsClient } from "@/components/reports/CostOperationReportsClient";

export const metadata = {
  title: "KM-Based Fleet Cost Reports | STR-VMS",
  description: "Variable mileage costing, diesel fuel indexation, and transporter payouts.",
};

export default async function KmBasedFleetReportsPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  const data = await getReportsInitialData();

  return (
    <div className="w-full">
      <CostOperationReportsClient
        operationType="KM_BASED"
        title="KM-Based Fleet Cost Analysis & Reports"
        description="Variable distance costing, monthly fuel escalation index, and driver earnings"
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
