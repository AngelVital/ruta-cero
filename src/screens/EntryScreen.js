const icon = (name) => `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;

export function renderEntryScreen() {
  return `
    <main class="entry-screen">
      <aside class="entry-brand-band" aria-label="Ruta Cero">
        <a class="entry-brand" href="/" aria-label="Ruta Cero, inicio">
          <span class="entry-brand-mark">${icon('recycling')}</span>
          <span><strong>RUTA CERO</strong><small>PLATAFORMA OPERATIVA</small></span>
        </a>
        <div class="entry-brand-note">
          <span class="entry-brand-rule"></span>
          <span>RECOLECCIÓN URBANA<br>CONTROL DE OPERACIONES</span>
        </div>
        <div class="entry-band-index" aria-hidden="true">RC / 01</div>
      </aside>

      <section class="entry-main" aria-labelledby="entry-title">
        <div class="entry-main-content">
          <div class="entry-eyebrow"><span></span> ACCESO AL SISTEMA</div>
          <h1 id="entry-title">Elige tu espacio de trabajo</h1>
          <p class="entry-subtitle">Selecciona el perfil para continuar.</p>

          <div class="entry-choices" role="group" aria-label="Vistas disponibles">
            <a class="entry-choice entry-choice-field" href="/?mode=field">
              <span class="entry-choice-icon">${icon('local_shipping')}</span>
              <span class="entry-choice-copy">
                <span class="entry-choice-kicker">OPERACIÓN EN CAMPO</span>
                <strong>Campo</strong>
                <span class="entry-choice-description">Despacho · inspección · ruta · recolección</span>
              </span>
              <span class="entry-choice-arrow">${icon('arrow_forward')}</span>
            </a>

            <a class="entry-choice entry-choice-admin" href="/?mode=admin">
              <span class="entry-choice-icon">${icon('space_dashboard')}</span>
              <span class="entry-choice-copy">
                <span class="entry-choice-kicker">CENTRO DE OPERACIONES</span>
                <strong>Administración</strong>
                <span class="entry-choice-description">Rutas · puntos · actividad de campo</span>
              </span>
              <span class="entry-choice-arrow">${icon('arrow_forward')}</span>
            </a>
          </div>

          <div class="entry-demo-note"><span class="entry-demo-indicator"></span> Prototipo · datos locales de demostración</div>
        </div>
        <footer class="entry-footer"><span>RUTA CERO</span><span>SELECCIÓN DE PERFIL</span></footer>
      </section>
    </main>
  `;
}
