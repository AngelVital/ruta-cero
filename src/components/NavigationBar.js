/**
 * Glove-Friendly Bottom Navigation Bar
 * 6 tactile tabs with active highlight and 0px sharp boundaries
 */

export function renderNavigationBar(state) {
  const tabs = [
    { id: 'dispatch', label: 'Despacho', icon: 'local_shipping' },
    { id: 'map', label: 'Mapa', icon: 'map' },
    { id: 'scanner', label: 'Escáner QR', icon: 'barcode_reader' },
    { id: 'report', label: 'Reporte', icon: 'assignment' }
  ];

  return `
    ${state.currentScreen === 'map' ? `
      <button type="button" class="btn-tactical btn-tactical-primary floating-scan-action" id="btn-quick-scan-active">
        <span class="material-symbols-outlined" style="font-size: 20px;">barcode_reader</span>
        <span>ESCANEAR</span>
      </button>
    ` : ''}
    <nav class="hud-bottom-nav">
      ${tabs.map(tab => {
        const isActive = state.currentScreen === tab.id;
        return `
          <button 
            type="button" 
            class="nav-tab-item ${isActive ? 'active' : ''}" 
            data-screen="${tab.id}"
            title="${tab.label}"
          >
            <span class="material-symbols-outlined">${tab.icon}</span>
            <span>${tab.label}</span>
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

export function attachNavigationBarEvents(container, store) {
  container.querySelector('#btn-quick-scan-active')?.addEventListener('click', () => {
    store.setScreen('scanner');
  });

  const buttons = container.querySelectorAll('.nav-tab-item');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const screen = e.currentTarget.getAttribute('data-screen');
      if (screen) {
        store.setScreen(screen);
      }
    });
  });
}
