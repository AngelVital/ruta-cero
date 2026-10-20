export const requiredReportPhotos = ['initialExterior', 'initialInterior', 'finalExterior', 'finalInterior'];

export function validateContainerReport(fillLevel, selectedMaterials, materialWeights) {
  if (!['low', 'medium', 'full'].includes(fillLevel)) {
    return 'Selecciona un nivel de llenado del contenedor';
  }

  if (fillLevel !== 'low' && (selectedMaterials.length === 0
    || selectedMaterials.some((matKey) => {
      const weight = Number(materialWeights[matKey]);
      return !Number.isFinite(weight) || weight <= 0;
    }))) {
    return 'Para niveles medio o lleno selecciona al menos un material y registra un peso mayor a 0 KG';
  }

  return null;
}

export const getMissingReportPhotos = (photoEvidence) => (
  requiredReportPhotos.filter((photoKey) => !photoEvidence[photoKey])
);

export function isContainerReportReady(fillLevel, selectedMaterials, materialWeights, photoEvidence) {
  return !validateContainerReport(fillLevel, selectedMaterials, materialWeights)
    && getMissingReportPhotos(photoEvidence).length === 0;
}

export const getTotalMaterialWeight = (selectedMaterials, materialWeights) => (
  selectedMaterials.reduce((sum, matKey) => sum + (Number(materialWeights[matKey]) || 0), 0)
);

/** Names of the incidents marked as active in a stored report. */
export function getActiveIncidents(incidents) {
  return incidents && typeof incidents === 'object'
    ? Object.entries(incidents).filter(([, active]) => Boolean(active)).map(([name]) => name)
    : [];
}

export function getLatestReportReceivedAt(reports) {
  return reports.reduce((latest, report) => (
    report.received_at && (!latest || report.received_at > latest) ? report.received_at : latest
  ), null);
}

/**
 * Adds newly fetched reports, skipping the ones already loaded, and keeps the list newest
 * first. A report synced late from an offline device can be older than the loaded ones.
 */
export function mergeNewReports(currentReports, newReports) {
  const loadedIds = new Set(currentReports.map((report) => report.id));
  const addedReports = newReports.filter((report) => !loadedIds.has(report.id));
  return addedReports.length
    ? [...addedReports, ...currentReports].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    : currentReports;
}

/** Most recent report of each container, keyed by container id. */
export function getLatestReportByContainer(reports) {
  const latestReports = new Map();
  reports.forEach((report) => {
    if (!report.container_id || !report.created_at) return;

    const currentReport = latestReports.get(report.container_id);
    if (!currentReport || report.created_at > currentReport.created_at) {
      latestReports.set(report.container_id, report);
    }
  });
  return latestReports;
}
