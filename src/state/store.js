/**
 * Store reactivo central para Ruta Cero
 * Coordina las pantallas de campo y los datos compartidos de la operación.
 *
 * El estado es inmutable: cada acción crea un objeto nuevo con setState() en lugar de
 * modificar el actual. Las pantallas solo leen `store.state` y llaman acciones.
 */
import { collectionPoints, returnStation } from '../data/collectionPoints.js';
import { getOperationalDate, getScheduledRoute } from '../services/routeConfiguration.js';
import { formatClockTime } from '../utils/format.js';

function createInitialState() {
  return {
    currentScreen: 'dispatch',
    screenTransition: null,
    unit: {
      id: 'U-01',
      model: 'Freightliner M2 Econovo',
      plates: 'LPZ-2099',
      compactorCapacity: '12 Toneladas',
      status: 'OPERATIVO'
    },
    operator: {
      name: 'Carlos Mendoza #402',
      license: 'B-883491 (Vigente)',
      shift: 'Matutino • 06:00 - 14:00',
      depot: 'Base Norte Pantaco'
    },
    dispatchOptions: {
      units: [
        { id: 'U-01', label: 'U-01' }
      ],
      drivers: [
        { id: 'C-001', label: 'Carlos Mendoza' },
        { id: 'C-002', label: 'Alejandro Torres' }
      ],
      assistants: [
        { id: 'A-001', label: 'Ana López' },
        { id: 'A-002', label: 'Jorge Ramírez' }
      ]
    },
    assignment: {
      unitId: null,
      driverId: null,
      assistantId: null
    },
    route: {
      id: 'R-01',
      name: 'Centro Histórico - Sector Norte',
      totalStops: 8,
      completedCount: 0,
      currentStopIndex: 0,
      status: 'PENDIENTE',
      startTime: '--:-- AM',
      startTimestamp: null,
      returning: false,
      dashboardPhoto: null,
      dashboardPhotoPath: null,
      completedAt: null,
      completedPointIds: [],
      statusDate: null
    },
    stops: collectionPoints.map((point, index) => ({
      ...point,
      status: index === 0 ? 'active' : 'pending'
    })),
    activeContainerId: 'CONT-01',
    inspection360: {
      tires: null,
      fluids: null,
      hydraulics: null,
      lights: null,
      brakes: null,
      wipers: null,
      mirrors: null,
      safetyGear: null,
      extinguisher: null,
      odometerPhotoEvidence: false,
      completed: false
    },
    inspectionComments: {},
    fuelLevel: {
      preset: null,
      liters: 0
    },
    // In-progress container reports keyed by container id (fill level, materials, photos…).
    reportDrafts: {},
    // Field actions saved on the device and not yet sent to Supabase (services/fieldSync.js).
    pendingSyncCount: 0,
    toast: null
  };
}

const returnStationStop = (status) => ({ ...returnStation, status });

export const fieldStateStorageKey = 'ruta-cero-field-state';
// The day's progress, kept on the device so closing the app (or losing signal) doesn't lose it.
const persistedKeys = [
  'currentScreen', 'assignment', 'route', 'stops', 'activeContainerId',
  'inspection360', 'inspectionComments', 'fuelLevel', 'reportDrafts'
];

function getStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function loadPersistedState() {
  try {
    const saved = JSON.parse(getStorage()?.getItem(fieldStateStorageKey));
    // Only today's run is restored; a new day starts from scratch.
    return saved?.route?.statusDate === getOperationalDate() ? saved : null;
  } catch {
    return null;
  }
}

class TacticalStore {
  constructor() {
    this.state = { ...createInitialState(), ...loadPersistedState() };
    this.listeners = [];
    this.lastRouteSignature = undefined;
    this.applyConfiguredRoute(getScheduledRoute(), false);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(changeType = 'state') {
    this.listeners.forEach(l => l(this.state, changeType));
  }

  /**
   * Replaces the state with a new object. `update` is a partial state or a function
   * (state) => partial state. With `notify: false` the screen is not re-rendered, for
   * changes the screen already shows (typing, toggles updated in place).
   */
  setState(update, { notify = true, changeType = 'state' } = {}) {
    const patch = typeof update === 'function' ? update(this.state) : update;
    this.state = { ...this.state, ...patch };
    if (persistedKeys.some((key) => key in patch)) this.persist();
    if (notify) this.notify(changeType);
  }

  persist() {
    const saved = Object.fromEntries(persistedKeys.map((key) => [key, this.state[key]]));
    // The return photo is a large data URL; after a restart it is simply taken again.
    saved.route = { ...saved.route, dashboardPhoto: null };
    try {
      getStorage()?.setItem(fieldStateStorageKey, JSON.stringify(saved));
    } catch {
      // Storage full or blocked: the app keeps working in memory.
    }
  }

  setPendingSyncCount(pendingSyncCount) {
    if (pendingSyncCount !== this.state.pendingSyncCount) {
      this.setState({ pendingSyncCount }, { changeType: 'sync' });
    }
  }

  setScreen(screenName, transition = 'slide-left') {
    this.setState({ currentScreen: screenName, screenTransition: transition });
  }

  /** Returns the pending screen transition once, so only the first render animates. */
  consumeScreenTransition() {
    const { screenTransition } = this.state;
    if (screenTransition) this.setState({ screenTransition: null }, { notify: false });
    return screenTransition;
  }

  selectContainer(id, shouldNotify = true) {
    this.setState(({ stops }) => ({
      activeContainerId: id,
      stops: stops.map((stop) => (
        stop.status === 'completed' ? stop : { ...stop, status: stop.id === id ? 'active' : 'pending' }
      ))
    }), { notify: shouldNotify });
  }

  updateInspectionItem(key, value, shouldNotify = true) {
    this.setState(({ inspection360 }) => ({
      inspection360: { ...inspection360, [key]: value }
    }), { notify: shouldNotify });
  }

  updateInspectionComment(key, comment) {
    this.setState(({ inspectionComments }) => ({
      inspectionComments: { ...inspectionComments, [key]: comment }
    }), { notify: false });
  }

  /** Marks the inspection as signed; the caller navigates away right after. */
  completeInspection() {
    this.setState(({ inspection360 }) => ({
      inspection360: { ...inspection360, completed: true }
    }), { notify: false });
  }

  setFuelPreset(preset, liters, shouldNotify = true) {
    this.setState(({ fuelLevel }) => ({
      fuelLevel: { ...fuelLevel, preset, liters }
    }), { notify: shouldNotify });
  }

  setDispatchAssignment(field, value, shouldNotify = true) {
    if (!Object.prototype.hasOwnProperty.call(this.state.assignment, field)) return;
    this.setState(({ assignment }) => ({
      assignment: { ...assignment, [field]: value }
    }), { notify: shouldNotify });
  }

  /** Merges `patch` into the in-progress report of a container without re-rendering. */
  updateReportDraft(containerId, patch) {
    this.setState(({ reportDrafts }) => ({
      reportDrafts: { ...reportDrafts, [containerId]: { ...reportDrafts[containerId], ...patch } }
    }), { notify: false });
  }

  applyConfiguredRoute(route, shouldNotify = true) {
    // Focus, visibility and Realtime refreshes usually return the same route; skipping them
    // avoids re-rendering the active screen (map iframe reload, open camera, report draft).
    const routeSignature = route
      ? JSON.stringify([
        route.id,
        route.zone,
        route.pointIds,
        route.status,
        route.statusDate,
        route.completedPointIds || [],
        route.dashboardPhotoPath || null,
        route.completedAt || null
      ])
      : null;
    if (routeSignature === this.lastRouteSignature) return;
    this.lastRouteSignature = routeSignature;

    const current = this.state;
    if (!route) {
      this.setState({
        stops: [],
        activeContainerId: null,
        reportDrafts: {},
        route: {
          ...current.route,
          id: '',
          name: '',
          totalStops: 0,
          completedCount: 0,
          currentStopIndex: 0,
          status: 'PENDIENTE',
          startTimestamp: null,
          startTime: '--:-- AM',
          returning: false,
          dashboardPhoto: null,
          dashboardPhotoPath: null,
          completedAt: null
        }
      }, { notify: shouldNotify });
      return;
    }

    const isSameRoute = current.route.id === route.id;
    const isSameRouteDay = isSameRoute && current.route.statusDate === route.statusDate;
    const completedStopIds = new Set([
      ...(route.completedPointIds || []),
      ...(isSameRouteDay
        ? current.stops
          .filter((stop) => stop.type !== 'return-station' && stop.status === 'completed')
          .map((stop) => stop.id)
        : [])
    ]);
    const routeStops = route.pointIds
      .map((pointId) => collectionPoints.find((point) => point.id === pointId))
      .filter(Boolean);
    // On the same route day keep what each stop already recorded (completed report data).
    const mappedRouteStops = routeStops.map((stop) => ({
      ...stop,
      ...(isSameRouteDay ? current.stops.find((currentStop) => currentStop.id === stop.id) : null),
      status: completedStopIds.has(stop.id) ? 'completed' : 'pending'
    }));
    const completedCount = mappedRouteStops.filter((stop) => stop.status === 'completed').length;
    const firstPendingStop = mappedRouteStops.find((stop) => stop.status !== 'completed');
    // A device that started or closed the route offline is ahead of the server until it syncs.
    const isCompleted = route.status === 'completed' || (isSameRouteDay && current.route.status === 'COMPLETADA');
    const isStarted = route.status === 'active' || (isSameRouteDay && current.route.status === 'EN RUTA');
    const returning = !isCompleted && mappedRouteStops.length > 0
      && (completedCount >= mappedRouteStops.length || (isSameRoute && current.route.returning));
    if (firstPendingStop) firstPendingStop.status = 'active';
    if (returning) mappedRouteStops.push(returnStationStop('active'));

    this.setState({
      stops: mappedRouteStops,
      activeContainerId: returning
        ? returnStation.id
        : firstPendingStop?.id || routeStops[0]?.id || null,
      reportDrafts: isSameRouteDay ? current.reportDrafts : {},
      route: {
        ...current.route,
        id: route.id,
        name: route.zone,
        totalStops: route.pointIds.length,
        completedCount: Math.min(route.pointIds.length, completedCount),
        currentStopIndex: 0,
        status: returning
          ? 'EN RUTA'
          : isCompleted ? 'COMPLETADA' : isStarted ? 'EN RUTA' : 'PENDIENTE',
        statusDate: route.statusDate,
        completedPointIds: [...completedStopIds],
        startTimestamp: isSameRouteDay ? current.route.startTimestamp : null,
        startTime: isSameRouteDay ? current.route.startTime : '--:-- AM',
        returning,
        dashboardPhoto: isSameRouteDay ? current.route.dashboardPhoto : null,
        dashboardPhotoPath: route.dashboardPhotoPath || null,
        completedAt: route.completedAt || null
      }
    }, { notify: shouldNotify });
  }

  /** Starts a new run of the scheduled route; the caller navigates to the map right after. */
  startRoute() {
    if (!this.state.route.id) return null;
    const startTimestamp = Date.now();
    this.setState(({ stops, route }) => {
      const nextStops = stops
        .filter((stop) => stop.type !== 'return-station')
        .map((stop, index) => ({ ...stop, status: index === 0 ? 'active' : 'pending' }));
      return {
        stops: nextStops,
        activeContainerId: nextStops[0]?.id || null,
        reportDrafts: {},
        route: {
          ...route,
          completedCount: 0,
          completedPointIds: [],
          returning: false,
          dashboardPhoto: null,
          startTimestamp,
          status: 'EN RUTA',
          startTime: formatClockTime(startTimestamp)
        }
      };
    }, { notify: false });
    return this.state.route.id;
  }

  completeContainerReport(containerId, reportData) {
    const { stops, route, reportDrafts } = this.state;
    if (!stops.some((stop) => stop.id === containerId)) {
      this.notify();
      return;
    }

    const nextStops = stops.map((stop) => {
      if (stop.id !== containerId) return stop;
      const completedStop = {
        ...stop,
        status: 'completed',
        fillLevel: reportData.fillLevel,
        collectedKg: reportData.collectedKg
      };
      if (reportData.materialWeights) completedStop.materialWeights = { ...reportData.materialWeights };
      if (reportData.materials) {
        completedStop.materials = reportData.materials;
        completedStop.material = reportData.materials[0] || stop.material;
      }
      if (reportData.photoEvidence) completedStop.photoEvidence = { ...reportData.photoEvidence };
      if (reportData.incidents) completedStop.incidents = { ...reportData.incidents };
      if (reportData.incidentComments !== undefined) completedStop.incidentComments = reportData.incidentComments;
      return completedStop;
    });
    const completedCount = nextStops.filter((stop) => stop.status === 'completed').length;
    const { [containerId]: _savedDraft, ...remainingDrafts } = reportDrafts;
    const nextState = {
      stops: nextStops,
      reportDrafts: remainingDrafts,
      route: {
        ...route,
        completedPointIds: [...new Set([...(route.completedPointIds || []), containerId])],
        completedCount
      }
    };

    // Activate the next pending stop, or the return station once every point is done.
    const nextPendingIndex = nextStops.findIndex((stop) => stop.status === 'pending');
    if (nextPendingIndex >= 0) {
      nextStops[nextPendingIndex] = { ...nextStops[nextPendingIndex], status: 'active' };
      nextState.activeContainerId = nextStops[nextPendingIndex].id;
    } else if (!route.returning && completedCount >= route.totalStops) {
      nextStops.push(returnStationStop('active'));
      nextState.activeContainerId = returnStation.id;
      nextState.route.returning = true;
    }

    this.setState(nextState);
  }

  setDashboardPhoto(photoDataUrl) {
    this.setState(({ route }) => ({ route: { ...route, dashboardPhoto: photoDataUrl } }));
  }

  completeRoute(dashboardPhotoPath) {
    if (!this.state.route.returning || !this.state.route.dashboardPhoto) return false;
    this.setState(({ stops, route }) => ({
      stops: stops.map((stop) => (stop.type === 'return-station' ? returnStationStop('completed') : stop)),
      route: {
        ...route,
        status: 'COMPLETADA',
        returning: false,
        dashboardPhotoPath: dashboardPhotoPath || null,
        completedAt: new Date().toISOString()
      }
    }));
    return true;
  }

  showToast(message, type = 'success', duration = 3000) {
    const toast = { message, type };
    this.setState({ toast }, { changeType: 'toast' });
    setTimeout(() => {
      if (this.state.toast === toast) {
        this.setState({ toast: null }, { changeType: 'toast' });
      }
    }, duration);
  }
}

export const store = new TacticalStore();
