/**
 * Standard Trip Statuses across STR-VMS
 */

// Active trips where vehicle and driver are considered occupied
export const ACTIVE_TRIP_STATUSES = [
  "ASSIGNED",
  "READY_FOR_LOADING",
  "GATE_PASS_ISSUED",
  "DISPATCHED",
  "IN_TRANSIT",
] as const;

export type ActiveTripStatus = (typeof ACTIVE_TRIP_STATUSES)[number];

// Terminal / Finished trips where vehicle and driver are considered released
export const TERMINAL_TRIP_STATUSES = [
  "COMPLETED",
  "RECONCILED",
  "FINALIZED",
  "CLOSED",
  "CANCELLED",
] as const;

export type TerminalTripStatus = (typeof TERMINAL_TRIP_STATUSES)[number];

// Trips locked against structural modifications (adding/removing requests, reversing)
export const LOCKED_TRIP_STATUSES = [
  "READY_FOR_LOADING",
  "GATE_PASS_ISSUED",
  "DISPATCHED",
  "IN_TRANSIT",
  "COMPLETED",
  "RECONCILED",
  "FINALIZED",
  "CLOSED",
] as const;
