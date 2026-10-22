/**
 * Cola de envíos de campo. Iniciar ruta, cada reporte y el cierre se guardan primero en el
 * dispositivo y se envían a Supabase en orden cuando hay conexión, para trabajar sin señal.
 */
import { store } from '../state/store.js';

export const syncQueueStorageKey = 'ruta-cero-sync-queue';
const loadSupabase = () => import('./supabase.js');
let flushInProgress = null;
let wentOffline = false;

function readQueue() {
  try {
    return JSON.parse(window.localStorage.getItem(syncQueueStorageKey)) || [];
  } catch {
    return [];
  }
}

// Not wrapped in try/catch: if the device can't store an item the caller must not advance.
function writeQueue(queue) {
  window.localStorage.setItem(syncQueueStorageKey, JSON.stringify(queue));
  store.setPendingSyncCount(queue.length);
}

const senders = {
  start: (api, { payload, at, crew }) => api.markRouteStarted(payload.routeId, at, crew),
  report: (api, { id, payload, at, crew }) => api.insertContainerReport(payload.routeId, payload.containerId, payload.report, {
    id,
    createdAt: at,
    crew
  }),
  complete: (api, { payload, at, crew }) => api.markRouteCompleted(payload.routeId, at, crew),
  incident: (api, { id, payload, at, crew }) => api.insertIncidentReport(payload, { id, createdAt: at, crew }),
  refuel: (api, { id, payload, at, crew }) => api.insertFuelLoad(payload, { id, createdAt: at, crew }),
  inspection: (api, { id, payload, at, crew }) => api.insertDispatchInspection(payload, { id, createdAt: at, crew }),
  closure: (api, { id, payload, at, crew }) => api.insertRouteCompletion(payload, { id, createdAt: at, crew })
};

// Records kept in the queue when Supabase rejects them: usually a schema problem the admin
// can fix, and dropping them would lose field data. Each entry names the record and its table.
const keptOnRejection = {
  report: ({ containerId }) => [`Reporte de ${containerId}`, 'container_reports'],
  incident: () => ['Incidencia', 'incident_reports'],
  refuel: () => ['Carga de combustible', 'fuel_loads'],
  inspection: () => ['Inspección 360°', 'dispatch_inspections'],
  closure: ({ routeId }) => [`Evidencia de cierre de ${routeId}`, 'route_completions']
};

function getReportSaveErrorMessage(error, table = 'container_reports') {
  if (error?.code === '22P02' && /"(low|medium|full)"/.test(error.message || '')) {
    return 'La columna fill_level de la base de datos sigue siendo INTEGER. Ejecuta el script schema.sql en la base de datos.';
  }

  if (String(error?.code).startsWith('STORAGE_')) {
    return `El almacenamiento de fotos rechazó la foto (${error.code}): ${error.message}. Ejecuta el script schema.sql para crear el bucket field-photos y sus permisos.`;
  }

  if (error?.code === '42501') {
    return `La base de datos rechazó la inserción por permisos o RLS. Ejecuta el script schema.sql y verifica el privilegio INSERT y la política de ${table}.`;
  }

  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    return `No se encuentra la tabla ${table}. Ejecuta el script schema.sql en la base de datos.`;
  }

  const code = error?.code ? ` (${error.code})` : '';
  return `Error de la base de datos${code}: ${error?.message || 'No se pudo completar la solicitud.'}`;
}

/**
 * Stores a field action and tries to send it. Returns false when Supabase is not configured
 * (local mode: nothing to sync). Throws if the device could not store it.
 */
export async function queueFieldAction(type, payload, loadApi = loadSupabase) {
  const { isSupabaseConfigured } = await loadApi();
  if (!isSupabaseConfigured) return false;

  // The crew is captured now: by the time it syncs the dispatch assignment may have changed.
  const crew = { ...store.state.assignment };
  writeQueue([...readQueue(), { id: crypto.randomUUID(), type, payload, crew, at: new Date().toISOString() }]);
  flushFieldQueue(loadApi);
  return true;
}

/** Sends pending actions in order. Stops at the first one without a response (offline). */
export function flushFieldQueue(loadApi = loadSupabase) {
  flushInProgress ||= sendQueue(loadApi).finally(() => {
    flushInProgress = null;
  });
  return flushInProgress;
}

async function sendQueue(loadApi) {
  if (readQueue().length === 0) return;
  const api = await loadApi();
  const attempted = new Set();
  let sent = 0;

  for (let item = readQueue()[0]; item; item = readQueue().find((pending) => !attempted.has(pending.id))) {
    attempted.add(item.id);
    try {
      await senders[item.type](api, item);
    } catch (error) {
      // Without an error code Supabase never answered: keep everything for the next attempt.
      if (!error?.code) {
        wentOffline = true;
        return;
      }
      if (keptOnRejection[item.type] && error.code !== '23505') {
        const [label, table] = keptOnRejection[item.type](item.payload);
        store.showToast(`${label} pendiente: ${getReportSaveErrorMessage(error, table)}`, 'info', 8000);
        continue;
      }
      // 23505: the record already arrived in an earlier attempt. Rejected route RPCs won't succeed on retry.
      if (error.code !== '23505') {
        store.showToast(`No se sincronizó ${item.payload.routeId}: ${error.message}`, 'info', 8000);
      }
    }
    writeQueue(readQueue().filter((pending) => pending.id !== item.id));
    sent += 1;
  }

  if (wentOffline && sent > 0 && readQueue().length === 0) {
    wentOffline = false;
    store.showToast('Registros pendientes guardados en la base de datos.');
  }
}

export function getPendingSyncCount() {
  return readQueue().length;
}
