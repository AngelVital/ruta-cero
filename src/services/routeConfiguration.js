export const routesStorageKey = 'ruta-cero.routes.v1';
export const selectedRouteStorageKey = 'ruta-cero.selected-route.v1';

const defaultRoutes = [
  {
    id: 'R-01',
    zone: 'Centro Histórico',
    pointIds: ['CONT-01', 'CONT-03', 'CONT-04'],
    stopsDone: 2,
    stopsTotal: 3,
    lastUpdate: '09:42',
    status: 'active',
    statusLabel: 'En ruta',
    syncLabel: '1 evento pendiente'
  },
  {
    id: 'R-02',
    zone: 'Sector Norte',
    pointIds: ['CONT-02', 'CONT-07'],
    stopsDone: 0,
    stopsTotal: 2,
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
  return defaultRoutes.map((route) => ({ ...route, pointIds: [...route.pointIds] }));
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

export function getSelectedRouteId() {
  const routes = getConfiguredRoutes();
  const storage = getStorage();
  const selectedId = storage?.getItem(selectedRouteStorageKey);
  return routes.some((route) => route.id === selectedId) ? selectedId : routes[0]?.id || null;
}

export function getSelectedRoute() {
  const selectedId = getSelectedRouteId();
  return getConfiguredRoutes().find((route) => route.id === selectedId) || null;
}

export function saveConfiguredRoutes(routes, selectedRouteId = getSelectedRouteId()) {
  const storage = getStorage();
  if (!storage) return false;

  storage.setItem(routesStorageKey, JSON.stringify(routes));
  const selectedId = routes.some((route) => route.id === selectedRouteId)
    ? selectedRouteId
    : routes[0]?.id;
  if (selectedId) {
    storage.setItem(selectedRouteStorageKey, selectedId);
  } else {
    storage.removeItem(selectedRouteStorageKey);
  }
  return true;
}

export function selectConfiguredRoute(routeId) {
  const route = getConfiguredRoutes().find((item) => item.id === routeId);
  if (!route) return false;

  const storage = getStorage();
  if (!storage) return false;

  storage.setItem(selectedRouteStorageKey, routeId);
  return true;
}

export function createRouteId(routes = getConfiguredRoutes()) {
  const highestId = routes.reduce((highest, route) => {
    const match = /^R-(\d+)$/.exec(route.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `R-${String(highestId + 1).padStart(2, '0')}`;
}
