/**
 * Ruta Cero • Plataforma Operativa de Campo y Administración
 * Entrada Principal de la Aplicación y Router Modular
 *
 * Basado en el Sistema de Diseño Field-Spec (Stitch #13352991854495087010)
 *
 * La página principal es el inicio de sesión: según el perfil de la cuenta (admin_users o
 * field_users en Supabase) se abre el panel de administración o el de campo.
 *
 * Cada modo carga solo su código y su hoja de estilos: el panel de administración
 * no descarga el escáner de campo y el teléfono no descarga el CSS del panel.
 *
 * El APK se compila con `vite build --mode android` (npm run build:android): solo
 * contiene el inicio de sesión y el panel de campo; el de administración ni siquiera se incluye.
 */

const appEl = document.getElementById('app');
// Vite replaces MODE at build time, so the admin branch is removed from the APK bundle.
const isFieldOnlyBuild = import.meta.env.MODE === 'android';
const requestedPanel = isFieldOnlyBuild ? 'field' : new URLSearchParams(window.location.search).get('mode');

// On the web an account with both roles opens administration; the APK only has the field panel.
const panelFor = (roles) => (!isFieldOnlyBuild && roles.admin ? 'admin' : roles.field ? 'field' : null);
const openPanel = (panel) => window.location.replace(`/?mode=${panel}`);

/** The panel the signed-in account may open, or null to show the login. */
async function getAllowedPanel() {
  const api = await import('./services/supabase.js');
  // Without Supabase there are no accounts: the field app runs in local mode.
  if (!api.isSupabaseConfigured) return 'field';

  try {
    if (!await api.getSupabaseSession()) return null;
    return panelFor(await api.getCurrentUserRoles());
  } catch (error) {
    // No answer from the server (no code): a phone already signed in keeps working offline.
    if (!error?.code && requestedPanel === 'field') return 'field';
    throw error;
  }
}

async function showLogin(message = '') {
  const [{ renderEntryScreen, attachEntryScreen }] = await Promise.all([
    import('./screens/EntryScreen.js'),
    import('./styles/entry-screen.css')
  ]);
  appEl.innerHTML = `<div id="entry-root">${renderEntryScreen(message)}</div>`;
  attachEntryScreen(document.getElementById('entry-root'), { panelFor, openPanel });
}

async function startApp() {
  // The APK and the installed PWA fill the phone screen instead of showing the framed phone used on desktop.
  const isInstalledPwa = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (isFieldOnlyBuild || isInstalledPwa) document.documentElement.classList.add('is-native-app');

  let panel;
  try {
    panel = await getAllowedPanel();
  } catch (error) {
    showLogin(`No se pudo verificar la sesión: ${error.message}`);
    return;
  }

  if (!panel) {
    showLogin();
    return;
  }

  if (panel !== requestedPanel) {
    openPanel(panel);
    return;
  }

  if (!isFieldOnlyBuild && panel === 'admin') {
    const [{ renderAdminDashboard, attachAdminDashboardEvents }] = await Promise.all([
      import('./screens/AdminDashboard.js'),
      import('./styles/admin-dashboard.css')
    ]);
    appEl.innerHTML = `<div id="admin-root">${renderAdminDashboard()}</div>`;
    attachAdminDashboardEvents(document.getElementById('admin-root'));
    return;
  }

  const [{ startFieldApp }] = await Promise.all([
    import('./fieldApp.js'),
    import('./styles/field.css')
  ]);
  startFieldApp(appEl);
}

startApp();
