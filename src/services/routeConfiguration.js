export const routesStorageKey = 'ruta-cero.routes.v1';

const defaultRoutes = [
  {
    id: 'R-01',
    zone: 'Centro Histórico',
    pointIds: ['CONT-01', 'CONT-03', 'CONT-04'],
    stopsDone: 0,
    stopsTotal: 3,
    scheduledFor: null,
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
    scheduledFor: null,
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
    scheduledFor: null,
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
    scheduledFor: index === 0 ? getOperationalDate() : route.scheduledFor,
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
      return routes;
    }
  } catch {
    return cloneDefaultRoutes();
  }

  return cloneDefaultRoutes();
}

export function getScheduledRoute(date = getOperationalDate()) {
  const routes = getConfiguredRoutes();
  return routes.find((route) => route.scheduledFor === date) || null;
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
