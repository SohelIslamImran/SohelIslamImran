import { useEffect, useState } from "react";

export function useDhakaClock() {
  const [now, setNow] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    let timeout = 0;
    let interval = 0;
    const tick = () => setNow(formatDhaka(new Date()));
    tick();
    const untilMinute = 60_000 - (Date.now() % 60_000) + 40;
    timeout = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 60_000);
    }, untilMinute);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
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
