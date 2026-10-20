const clockTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

/** HH:mm in 24-hour format, in the device time zone. */
export function formatClockTime(value = new Date()) {
  return clockTimeFormatter.format(value instanceof Date ? value : new Date(value));
}

/** Elapsed time as "N min" or "N h MM min"; returns 'Sin iniciar' for invalid dates. */
export function formatElapsedTime(startedAt, endTimestamp = Date.now()) {
  const startTime = typeof startedAt === 'number' ? startedAt : Date.parse(startedAt);
  const endTime = typeof endTimestamp === 'number' ? endTimestamp : Date.parse(endTimestamp);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 'Sin iniciar';

  const elapsedMinutes = Math.max(0, Math.floor((endTime - startTime) / 60000));
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const remainingMinutes = elapsedMinutes % 60;
  return elapsedHours > 0
    ? `${elapsedHours} h ${String(remainingMinutes).padStart(2, '0')} min`
    : `${elapsedMinutes} min`;
}
