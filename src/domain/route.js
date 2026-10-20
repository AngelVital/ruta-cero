import { getOperationalDate, getRouteForDate } from '../services/routeConfiguration.js';
import { formatClockTime } from '../utils/format.js';

export function getReportsForDate(reports, date) {
  return reports.filter((report) => getOperationalDate(new Date(report.created_at)) === date);
}

export function filterRoutes(routes, searchValue, statusValue) {
  const query = searchValue.trim().toLocaleLowerCase('es-MX');
  return routes.filter((route) => {
    const matchesStatus = statusValue === 'all' || route.status === statusValue;
    const searchableText = `${route.id} ${route.zone} ${route.pointIds.join(' ')}`.toLocaleLowerCase('es-MX');
    return matchesStatus && searchableText.includes(query);
  });
}

export function applyReportProgress(routes, reports, today = getOperationalDate()) {
  return routes.map((route) => {
    const isScheduledToday = route.scheduledDates?.includes(today);
    const routeReports = reports.filter((report) => (
      report.route_id === route.id
      && route.pointIds.includes(report.container_id)
      && isScheduledToday
      && getOperationalDate(new Date(report.created_at)) === today
    ));
    const visitedPoints = new Set(routeReports.map((report) => report.container_id));
    const stopsDone = isScheduledToday
      ? Math.min(route.pointIds.length, Math.max(route.statusDate === today ? route.stopsDone || 0 : 0, visitedPoints.size))
      : 0;
    const latestReport = routeReports.reduce((latest, report) => (
      !latest || report.created_at > latest.created_at ? report : latest
    ), null);
    const status = !isScheduledToday
      ? 'unscheduled'
      : route.statusDate === today && route.status === 'completed'
        ? 'completed'
        : (route.statusDate === today && route.status === 'active') || stopsDone > 0
          ? 'active'
          : 'scheduled';
    return getRouteForDate({
      ...route,
      stopsDone,
      stopsTotal: route.pointIds.length,
      lastUpdate: latestReport
        ? formatClockTime(latestReport.created_at)
        // Like stopsDone, a stored update time only counts when it belongs to today.
        : isScheduledToday && route.statusDate === today ? route.lastUpdate || '--:--' : '--:--',
      status,
      statusDate: today
    }, today);
  });
}

/** Today's figures for the admin KPIs: scheduled route, its attended points and today's reports. */
export function getTodaySummary(routes, reports, today = getOperationalDate()) {
  const scheduledRoute = routes.find((route) => route.scheduledDates?.includes(today)) || null;
  const todaysReports = getReportsForDate(reports, today);
  const visitedPointIds = new Set([
    ...(scheduledRoute?.completedPointIds || []),
    ...todaysReports
      .filter((report) => report.route_id === scheduledRoute?.id)
      .map((report) => report.container_id)
      .filter((containerId) => scheduledRoute?.pointIds.includes(containerId))
  ]);
  const totalPoints = scheduledRoute?.pointIds.length || 0;

  return {
    scheduledRoute,
    scheduledCount: routes.filter((route) => route.scheduledDates?.includes(today)).length,
    todaysReports,
    totalPoints,
    completedPoints: Math.min(totalPoints, Math.max(scheduledRoute?.stopsDone || 0, visitedPointIds.size))
  };
}

/**
 * Creates or edits a route. Changing an existing route's points resets its daily progress,
 * because the previous progress no longer matches the new definition.
 */
export function upsertRoute(routes, { routeId, zone, pointIds }) {
  const currentRoute = routes.find((route) => route.id === routeId);
  if (!currentRoute) {
    return [...routes, {
      id: routeId,
      zone,
      pointIds,
      scheduledDates: [],
      stopsDone: 0,
      stopsTotal: pointIds.length,
      lastUpdate: '--:--',
      status: 'scheduled',
      statusLabel: 'Programada',
      syncLabel: 'Sin iniciar'
    }];
  }

  const routeDefinitionChanged = currentRoute.pointIds.length !== pointIds.length
    || currentRoute.pointIds.some((pointId, index) => pointId !== pointIds[index]);
  return routes.map((route) => route.id === routeId
    ? {
      ...route,
      zone,
      pointIds,
      stopsDone: routeDefinitionChanged ? 0 : route.stopsDone,
      lastUpdate: routeDefinitionChanged ? '--:--' : route.lastUpdate,
      status: routeDefinitionChanged ? 'scheduled' : route.status,
      statusLabel: routeDefinitionChanged ? 'Programada' : route.statusLabel,
      stopsTotal: pointIds.length
    }
    : route);
}

export function buildRoutesCsv(routes) {
  const csvRows = [
    ['Ruta', 'Zona', 'Puntos incluidos', 'Puntos atendidos', 'Total de puntos', 'Estado', 'Última actualización', 'Sincronización'],
    ...routes.map((route) => [route.id, route.zone, route.pointIds.join(' '), route.stopsDone, route.stopsTotal, route.statusLabel, route.lastUpdate, route.syncLabel])
  ];
  return csvRows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
}
