"use client";

export type FrontendTrackPayload = {
  event:
    | "view_home"
    | "view_typology"
    | "view_unit"
    | "open_tour_360"
    | "click_whatsapp"
    | "start_reservation"
    | "complete_reservation"
    | "schedule_appointment";
  path?: string;
  metadata?: Record<string, unknown>;
};

export async function trackEventClient(payload: FrontendTrackPayload) {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Best-effort tracking only.
  }
}

