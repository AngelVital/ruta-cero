/**
 * Glove-Friendly Bottom Navigation Bar
 * 6 tactile tabs with active highlight and 0px sharp boundaries
 */

export function renderNavigationBar(state) {
  const tabs = [
    { id: 'dispatch', label: 'Despacho', icon: 'local_shipping' },
    { id: 'map', label: 'Mapa R-04', icon: 'map' },
    { id: 'scanner', label: 'Escáner QR', icon: 'qr_code_scanner' },
    { id: 'report', label: 'Reporte', icon: 'assignment' }
  ];

  return `
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
