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
  start: (api, { payload, at }) => api.markRouteStarted(payload.routeId, at),
  report: (api, { id, payload, at }) => api.insertContainerReport(payload.routeId, payload.containerId, payload.report, {
    id,
    createdAt: at
  }),
  complete: (api, { payload, at }) => api.markRouteCompleted(payload.routeId, at)
};

function getReportSaveErrorMessage(error) {
  if (error?.code === '22P02' && /"(low|medium|full)"/.test(error.message || '')) {
    return 'La columna fill_level de Supabase sigue siendo INTEGER. Ejecuta supabase/schema.sql en el SQL Editor de ese proyecto.';
  }

  if (error?.code === '42501') {
    return 'Supabase rechazó la inserción por permisos o RLS. Ejecuta supabase/schema.sql y verifica el privilegio INSERT y la política de container_reports.';
  }

  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    return 'No se encuentra la tabla container_reports. Ejecuta supabase/schema.sql en tu proyecto de Supabase.';
  }

  const code = error?.code ? ` (${error.code})` : '';
  return `Error de Supabase${code}: ${error?.message || 'No se pudo completar la solicitud.'}`;
}

/**
 * Stores a field action and tries to send it. Returns false when Supabase is not configured
 * (local mode: nothing to sync). Throws if the device could not store it.
 */
export async function queueFieldAction(type, payload, loadApi = loadSupabase) {
  const { isSupabaseConfigured } = await loadApi();
  if (!isSupabaseConfigured) return false;

  writeQueue([...readQueue(), { id: crypto.randomUUID(), type, payload, at: new Date().toISOString() }]);
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
      if (item.type === 'report' && error.code !== '23505') {
        // Kept: a rejected report is usually a schema problem the admin can fix, and dropping it loses data.
        store.showToast(`Reporte de ${item.payload.containerId} pendiente: ${getReportSaveErrorMessage(error)}`, 'info', 8000);
        continue;
      }
      // 23505: the report already arrived in an earlier attempt. Rejected route RPCs won't succeed on retry.
      if (error.code !== '23505') {
        store.showToast(`No se sincronizó ${item.payload.routeId}: ${error.message}`, 'info', 8000);
      }
    }
    writeQueue(readQueue().filter((pending) => pending.id !== item.id));
    sent += 1;
  }

  if (wentOffline && sent > 0 && readQueue().length === 0) {
    wentOffline = false;
    store.showToast('Registros pendientes sincronizados con Supabase.');
  }
}

export function getPendingSyncCount() {
  return readQueue().length;
}
