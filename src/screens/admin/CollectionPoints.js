import { collectionPoints } from '../../data/collectionPoints.js';
import { getLatestReportByContainer } from '../../domain/report.js';
import { formatScheduledDate } from './format.js';

function getDaysSinceCollection(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const lastCollection = Date.UTC(year, month - 1, day);
  return Math.max(0, Math.floor((today - lastCollection) / 86400000));
}

function renderCollectionPoint(point, report) {
  const lastCollectedOn = report?.created_at?.slice(0, 10) || point.lastCollectedOn;
  const daysSinceCollection = getDaysSinceCollection(lastCollectedOn);
  const ageClass = daysSinceCollection >= 7 ? 'age-overdue' : daysSinceCollection >= 4 ? 'age-due-soon' : 'age-recent';

  return `
    <tr>
      <td><span class="admin-route-id">${point.id}</span><span class="admin-cell-primary">${point.name}</span></td>
      <td><time datetime="${lastCollectedOn}">${formatScheduledDate(lastCollectedOn)}</time></td>
      <td><span class="admin-days-badge ${ageClass}">${daysSinceCollection === 0 ? 'Hoy' : `${daysSinceCollection} ${daysSinceCollection === 1 ? 'día' : 'días'}`}</span></td>
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
