/**
 * Ruta Cero • HUD Táctico de Operaciones de Campo
 * Entrada Principal de la Aplicación y Router Modular
 * 
 * Basado en el Sistema de Diseño Field-Spec HUD (Stitch #13352991854495087010)
 */

import { store } from './state/store.js';
import { renderNavigationBar, attachNavigationBarEvents } from './components/NavigationBar.js';

// Screens
import { renderDispatchScreen, attachDispatchScreenEvents } from './screens/DispatchScreen.js';
import { renderInspection360Screen, attachInspection360Events } from './screens/Inspection360Screen.js';
import { renderFuelLevelScreen, attachFuelLevelEvents } from './screens/FuelLevelScreen.js';
import { renderRouteMapScreen, attachRouteMapEvents } from './screens/RouteMapScreen.js';
import { renderQRScannerScreen, attachQRScannerEvents } from './screens/QRScannerScreen.js';
import { renderContainerReportScreen, attachContainerReportEvents } from './screens/ContainerReportScreen.js';

const appEl = document.getElementById('app');

function renderToast(state) {
  const toastRoot = document.getElementById('toast-root');
  if (!toastRoot) {
    return;
  }

  toastRoot.innerHTML = state.toast ? `
    <div class="hud-toast">
      <span class="material-symbols-outlined" style="color: #00a86b;">
        ${state.toast.type === 'info' ? 'info' : 'check_circle'}
      </span>
      <span>${state.toast.message}</span>
    </div>
  ` : '';
}

// Track the last rendered screen to detect navigation vs. in-screen re-renders
let previousScreen = null;

function renderApp() {
  const state = store.state;
  const oldViewport = document.getElementById('screen-viewport-root');
  const screenChanged = previousScreen !== null && previousScreen !== state.currentScreen;
  const savedScrollTop = (!screenChanged && oldViewport) ? oldViewport.scrollTop : 0;

  if (screenChanged && oldViewport) {
    oldViewport.querySelectorAll('video').forEach((video) => {
      video.pause();
      video.srcObject?.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    });
  }

  previousScreen = state.currentScreen;
  const screenTransition = state.screenTransition;
  state.screenTransition = null;

  // Select active screen renderer and attach event handler
  let screenHtml = '';
  let attachEvents = null;

  switch (state.currentScreen) {
    case 'dispatch':
      screenHtml = renderDispatchScreen(state);
      attachEvents = attachDispatchScreenEvents;
      break;
    case 'inspection':
      screenHtml = renderInspection360Screen(state);
      attachEvents = attachInspection360Events;
      break;
    case 'fuel':
      screenHtml = renderFuelLevelScreen(state);
      attachEvents = attachFuelLevelEvents;
      break;
    case 'map':
      screenHtml = renderRouteMapScreen(state);
      attachEvents = attachRouteMapEvents;
      break;
    case 'scanner':
      screenHtml = renderQRScannerScreen(state);
      attachEvents = attachQRScannerEvents;
      break;
    case 'report':
      screenHtml = renderContainerReportScreen(state);
      attachEvents = attachContainerReportEvents;
      break;
    default:
      screenHtml = renderDispatchScreen(state);
      attachEvents = attachDispatchScreenEvents;
  }

  // Master Shell Layout
  appEl.innerHTML = `
    <div class="hud-canvas">
      <div class="mobile-chassis" id="main-mobile-chassis">
        <main class="screen-viewport${screenTransition === 'slide-left' ? ' screen-transition-slide-left' : ''}" id="screen-viewport-root">
          ${screenHtml}
        </main>

        ${renderNavigationBar(state)}
        <div id="toast-root"></div>
      </div>
    </div>
  `;

  renderToast(state);

  // Attach Navigation events
  attachNavigationBarEvents(appEl, store);

  // Attach Screen-specific events
  const viewport = document.getElementById('screen-viewport-root');
  if (attachEvents && viewport) {
    attachEvents(viewport, store);
  }

  // Restore scroll position if previously saved
  if (viewport && savedScrollTop) {
    viewport.scrollTop = savedScrollTop;
  }
}

// Initial render
renderApp();

// Subscribe to store updates for reactive re-render
store.subscribe((state, changeType) => {
  if (changeType === 'toast') {
    renderToast(state);
    return;
  }

  renderApp();
});
