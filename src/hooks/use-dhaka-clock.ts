import { useEffect, useState } from "react";

export function useDhakaClock() {
  const [now, setNow] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    const tick = () => setNow(formatDhaka(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}

function formatDhaka(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("weekday")} ${get("day")} ${get("month")}`.toUpperCase(),
    time: `${get("hour")}:${get("minute")}`,
  };
}
