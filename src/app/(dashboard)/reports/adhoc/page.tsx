import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getReportsInitialData } from "@/lib/reports-data";
import { CostOperationReportsClient } from "@/components/reports/CostOperationReportsClient";

export const metadata = {
  title: "Outside & Ad-Hoc Hires Cost Reports | STR-VMS",
  description: "Spot-hire vendor ledger, flat-rate trips, and plant expense allocations.",
};

export default async function AdhocFleetReportsPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  const data = await getReportsInitialData();

  return (
    <div className="w-full">
      <CostOperationReportsClient
        operationType="ADHOC"
        title="Outside & Ad-Hoc Hires Cost Analysis & Reports"
        description="External transporter billing ledger, flat-rate hires, and cargo cost allocations"
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
