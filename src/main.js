/**
 * Ruta Cero • Plataforma Operativa de Campo y Administración
 * Entrada Principal de la Aplicación y Router Modular
 *
 * Basado en el Sistema de Diseño Field-Spec (Stitch #13352991854495087010)
 *
 * Cada modo carga solo su código y su hoja de estilos: el panel de administración
 * no descarga el escáner de campo y el teléfono no descarga el CSS del panel.
 *
 * El APK se compila con `vite build --mode android` (npm run build:android): solo
 * contiene el panel de campo, y el panel de administración ni siquiera se incluye.
 */

const appEl = document.getElementById('app');
// Vite replaces MODE at build time, so the admin and entry branches are removed from the APK bundle.
const isFieldOnlyBuild = import.meta.env.MODE === 'android';
const mode = isFieldOnlyBuild ? 'field' : new URLSearchParams(window.location.search).get('mode');

async function startApp() {
  // The APK fills the phone screen instead of showing the framed phone used on desktop.
  if (isFieldOnlyBuild) document.documentElement.classList.add('is-native-app');

  if (!isFieldOnlyBuild && mode === 'admin') {
    const [{ renderAdminDashboard, attachAdminDashboardEvents }] = await Promise.all([
      import('./screens/AdminDashboard.js'),
      import('./styles/admin-dashboard.css')
    ]);
    appEl.innerHTML = `<div id="admin-root">${renderAdminDashboard()}</div>`;
    attachAdminDashboardEvents(document.getElementById('admin-root'));
    return;
  }

  if (mode === 'field') {
    const [{ startFieldApp }] = await Promise.all([
      import('./fieldApp.js'),
      import('./styles/field.css')
    ]);
    startFieldApp(appEl);
    return;
  }

  if (isFieldOnlyBuild) return;

  const [{ renderEntryScreen }] = await Promise.all([
    import('./screens/EntryScreen.js'),
    import('./styles/entry-screen.css')
  ]);
  appEl.innerHTML = `<div id="entry-root">${renderEntryScreen()}</div>`;
}

startApp();
