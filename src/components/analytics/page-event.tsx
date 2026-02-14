"use client";

import { useEffect } from "react";

import { type FrontendTrackPayload, trackEventClient } from "@/lib/analytics/track-event";

type PageEventProps = FrontendTrackPayload;

export function PageEvent(props: PageEventProps) {
  useEffect(() => {
    void trackEventClient(props);
  }, [props]);

  return null;
}

