export const routesStorageKey = 'ruta-cero.routes.v1';

const defaultRoutes = [
  {
    id: 'R-01',
    zone: 'Centro Histórico',
    pointIds: ['CONT-01', 'CONT-03', 'CONT-04'],
    stopsDone: 0,
    stopsTotal: 3,
    scheduledDates: [],
    lastUpdate: '--:--',
    status: 'scheduled',
    statusLabel: 'Programada',
    syncLabel: 'Sin iniciar'
  },
  {
    id: 'R-02',
    zone: 'Sector Norte',
    pointIds: ['CONT-02', 'CONT-07'],
    stopsDone: 0,
    stopsTotal: 2,
    scheduledDates: [],
    lastUpdate: '--:--',
    status: 'scheduled',
    statusLabel: 'Programada',
    syncLabel: 'Sin iniciar'
  },
  {
    id: 'R-03',
    zone: 'Sector Sur',
    pointIds: ['CONT-05', 'CONT-06', 'CONT-08'],
    stopsDone: 0,
    stopsTotal: 3,
    scheduledDates: [],
    lastUpdate: '--:--',
    status: 'scheduled',
    statusLabel: 'Programada',
    syncLabel: 'Sin iniciar'
  }
];

function getStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function cloneDefaultRoutes() {
  return defaultRoutes.map((route, index) => ({
    ...route,
    scheduledDates: index === 0 ? [getOperationalDate()] : [...route.scheduledDates],
    pointIds: [...route.pointIds]
  }));
}

export function getOperationalDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mazatlan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getRouteForDate(route, date = getOperationalDate()) {
  const isScheduled = route.scheduledDates?.includes(date);
  const hasDailyStatus = route.statusDate === date;
  const dailyStatus = ['scheduled', 'active', 'completed'].includes(route.status)
    ? route.status
    : 'scheduled';
  const status = !isScheduled
    ? 'unscheduled'
    : hasDailyStatus ? dailyStatus : 'scheduled';
  const statusLabels = {
    unscheduled: 'No programada',
    scheduled: 'Programada',
    active: 'En curso',
    completed: 'Completada'
  };

  return {
    ...route,
    status,
    statusLabel: statusLabels[status] || statusLabels.scheduled,
    stopsDone: isScheduled && hasDailyStatus ? route.stopsDone || 0 : 0,
    lastUpdate: isScheduled && hasDailyStatus ? route.lastUpdate || '--:--' : '--:--',
    syncLabel: isScheduled && hasDailyStatus ? route.syncLabel || 'Sin iniciar' : 'Sin iniciar',
    statusDate: date
  };
}

export function getConfiguredRoutes() {
  const storage = getStorage();
  if (!storage) return cloneDefaultRoutes();

  const serializedRoutes = storage.getItem(routesStorageKey);
  if (serializedRoutes === null) return cloneDefaultRoutes();

  try {
    const routes = JSON.parse(serializedRoutes);
    if (Array.isArray(routes) && routes.every((route) => (
      route && typeof route.id === 'string'
      && typeof route.zone === 'string'
      && Array.isArray(route.pointIds)
    ))) {
      return routes.map((route) => ({
        ...route,
        scheduledDates: Array.isArray(route.scheduledDates)
          ? route.scheduledDates
          : route.scheduledFor ? [route.scheduledFor] : []
      }));
    }
  } catch {
    return cloneDefaultRoutes();
  }

  return cloneDefaultRoutes();
}

export function getScheduledRoute(date = getOperationalDate()) {
  const routes = getConfiguredRoutes();
  const route = routes.find((item) => item.scheduledDates?.includes(date));
  return route ? getRouteForDate(route, date) : null;
}

export function assignRouteToDate(routes, date, routeId) {
  return routes.map((route) => {
    const scheduledDates = (route.scheduledDates || []).filter((scheduledDate) => scheduledDate !== date);
    if (route.id === routeId) scheduledDates.push(date);
    return { ...route, scheduledDates: scheduledDates.sort() };
  });
}

export function saveConfiguredRoutes(routes) {
  const storage = getStorage();
  if (!storage) return false;

  storage.setItem(routesStorageKey, JSON.stringify(routes));
  return true;
}

export function createRouteId(routes = getConfiguredRoutes()) {
  const highestId = routes.reduce((highest, route) => {
    const match = /^R-(\d+)$/.exec(route.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `R-${String(highestId + 1).padStart(2, '0')}`;
}
