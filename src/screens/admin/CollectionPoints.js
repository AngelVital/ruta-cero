import { collectionPoints } from '../../data/collectionPoints.js';
import { getLatestReportByContainer } from '../../domain/report.js';
import { getOperationalDate } from '../../services/routeConfiguration.js';
import { formatScheduledDate } from './format.js';

function getDaysSinceCollection(dateString) {
  // Date-only strings parse as UTC midnight, so the difference is always whole days.
  return Math.max(0, (Date.parse(getOperationalDate()) - Date.parse(dateString)) / 86400000);
}

function renderCollectionPoint(point, report) {
  if (!report) {
    return `
    <tr>
      <td><span class="admin-route-id">${point.id}</span><span class="admin-cell-primary">${point.name}</span></td>
      <td>Sin registro</td>
      <td>—</td>
    </tr>
  `;
  }
  const lastCollectedOn = getOperationalDate(new Date(report.created_at));
  const daysSinceCollection = getDaysSinceCollection(lastCollectedOn);
  const ageClass = daysSinceCollection > 2 ? 'age-overdue' : daysSinceCollection === 2 ? 'age-due-soon' : 'age-recent';

  return `
    <tr>
      <td><span class="admin-route-id">${point.id}</span><span class="admin-cell-primary">${point.name}</span></td>
      <td><time datetime="${lastCollectedOn}">${formatScheduledDate(lastCollectedOn)}</time></td>
      <td><span class="admin-days-badge ${ageClass}">${daysSinceCollection === 0 ? 'Hoy' : daysSinceCollection === 1 ? 'Ayer' : `${daysSinceCollection} días`}</span></td>
    </tr>
  `;
}

/** One row per collection point, using its most recent report as the last visit. */
export function renderCollectionPointTable(reports = []) {
  const latestReports = getLatestReportByContainer(reports);
  return collectionPoints
    .map((point) => renderCollectionPoint(point, latestReports.get(point.id)))
    .join('');
}
