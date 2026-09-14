/**
 * Segmented 4-Block Capacity Meter Component
 * Visualizes bin capacity levels (0-25%, 26-50%, 51-75%, 76-100%)
 * Includes dynamic progress fill for instant visual feedback
 */

export function renderCapacityMeter(percentage) {
  const pct = Math.min(100, Math.max(0, percentage));
  let statusClass = 'optimal';
  let statusText = 'BAJO';

  if (pct > 75) {
    statusClass = 'critical';
    statusText = 'LLENO';
  } else if (pct > 50) {
    statusClass = 'warning';
    statusText = 'MEDIO';
  }

  const filledBlocks = pct === 0 ? 0 : Math.min(4, Math.round(pct / 25));

  const blockClasses = Array.from({ length: 4 }, (_, index) => {
    return index < filledBlocks ? `filled-${statusClass}` : '';
  });

  return `
    <div class="capacity-meter-wrap">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
        <span class="font-label-sm" style="color: #475569;">NIVEL DE LLENADO ESTIMADO</span>
        <span class="font-headline-sm" id="capacity-percentage-display" style="color: var(--color-cap-${statusClass}); font-weight: 800;">
          ${pct}% • ${statusText}
        </span>
      </div>

      <div class="capacity-blocks" id="capacity-meter-blocks">
        <div class="capacity-block ${blockClasses[0]}" data-block="1"></div>
        <div class="capacity-block ${blockClasses[1]}" data-block="2"></div>
        <div class="capacity-block ${blockClasses[2]}" data-block="3"></div>
        <div class="capacity-block ${blockClasses[3]}" data-block="4"></div>
      </div>

    </div>
  `;
}
