# Ruta Cero

Plataforma operativa para coordinar las rutas urbanas de recolección de residuos de Ruta Cero. Incluye una aplicación móvil de campo para preparar unidades, recorrer rutas y registrar recolecciones, además de un panel de administración para configurar recorridos y consultar reportes.

## Arquitectura

- **Frontend:** JavaScript vanilla con módulos ES.
- **Build y servidor local:** Vite 6.
- **Entrada:** `index.html` carga `src/main.js`.
- **Arranque por modo:** `main.js` solo decide el modo (`entry`, `field` o `admin`) y carga con `import()` el código y el CSS de ese modo. El panel de administración, el lector de códigos (ZXing) y Supabase no se descargan en las pantallas que no los usan.
- **Renderizado:** cada pantalla expone `renderX(state)`, que devuelve HTML, y `attachX(el, store)`, que monta sus eventos y puede devolver una función de limpieza (temporizadores, cámara). `src/fieldApp.js` es el shell del modo campo: elige la pantalla activa, ejecuta la limpieza de la anterior y vuelve a dibujar cuando cambia el estado.
- **Estado:** `src/state/store.js` contiene un store inmutable: cada acción crea un estado nuevo y avisa a los suscriptores. Incluye los borradores de reporte por contenedor, para que una actualización de la ruta o la cámara no borre lo capturado. El avance del día se guarda en el dispositivo (`localStorage`) y se recupera al reabrir la app. La configuración de rutas se comparte mediante `public.route_configurations` en Supabase y se mantiene en caché local.
- **Trabajo sin conexión:** `src/services/fieldSync.js` guarda en una cola del dispositivo la inspección de despacho, el inicio de ruta, cada reporte, las incidencias, las cargas de combustible, la evidencia de cierre y el cierre, y los envía a Supabase en orden cuando hay señal.
- **Fotos:** se capturan como JPEG comprimido (`src/components/FieldPhotos.js`) y viajan en la cola del dispositivo. Al sincronizar, `src/services/supabase.js` sube cada foto al bucket privado `field-photos` de Supabase Storage y la fila guarda solo la ruta del archivo; el panel las muestra con enlaces firmados temporales.
- **Lógica de negocio:** `src/domain/` contiene funciones puras (validación de inspección y reportes, avance de rutas, resumen del día, CSV), sin acceso al DOM, cubiertas por las pruebas de `tests/`.
- **UI:**
  - `src/components/`: medidores, controles y captura de fotos.
  - `src/screens/`: vistas operativas de campo y el controlador del panel de administración.
  - `src/screens/admin/`: secciones del panel (calendario, tabla de rutas, reportes, puntos, inicio de sesión).
  - `src/data/`: catálogos fijos (puntos de recolección, estación de regreso, puntos de inspección, combustible).
  - `src/utils/`: escape de HTML, íconos y formato de horas.
  - `src/styles/`: tokens, estilos generales y CSS por modo (`field.css`, `admin-dashboard.css`, `entry-screen.css`). Las pantallas usan clases CSS; solo los anchos que dependen de datos van como estilos en línea.

Esta separación (render/attach, store con suscripción y lógica pura en `domain/`) está pensada para facilitar una migración futura a React: las funciones de `domain/` y `data/` se pueden reutilizar tal cual.
- **Diseño:** el sistema visual Field-Spec está documentado en `design-system/DESIGN_SYSTEM.md`, con tokens reutilizables en `design-system/` y `src/styles/`.

## Flujo de campo

Abre `/?mode=field` o elige **Campo** en la pantalla inicial. El flujo sigue la ruta seleccionada por administración:

1. **Preparar la salida:** en Despacho se eligen unidad, operador, auxiliar y ruta. Antes de iniciar, registra el nivel de combustible y completa la inspección 360°.
2. **Registrar combustible:** selecciona uno de los niveles predefinidos y guarda el registro para volver a Despacho.
3. **Completar inspección:** revisa los nueve puntos del vehículo como Bien, Regular o Mal. Los estados Regular y Mal requieren comentario; también se debe tomar la foto del odómetro (ya no se captura el kilometraje a mano). Al completar todo, confirma la inspección.
4. **Iniciar y recorrer:** inicia la ruta desde Despacho. Al iniciar se envían a administración los resultados de la inspección, sus comentarios, los litros de combustible y la foto del odómetro. El mapa muestra el punto activo, el avance y los puntos programados; ofrece abrir indicaciones en Google Maps.
5. **Identificar el contenedor:** escanea el código QR o código de barras del punto activo. Si la cámara no logra leerlo, se puede elegir manualmente el mismo punto activo. Los códigos de otros puntos no permiten avanzar.
6. **Registrar la recolección:** toma fotos iniciales y finales del exterior e interior, indica el nivel de llenado y registra materiales, peso por material e incidencias. Para nivel medio o lleno se requiere al menos un material con peso mayor que cero; para nivel bajo no hace falta registrar material.
7. **Guardar y continuar:** guarda el reporte. El punto queda completado y el mapa activa el siguiente; al completar todos los contenedores de cualquier ruta, se agrega la estación de regreso y se muestran sus indicaciones en el mapa.
8. **Finalizar la ruta:** al llegar a la estación, captura de 1 a 3 fotos de evidencia de regreso (se pueden quitar y repetir) y confirma el cierre para volver a Despacho.

Durante la ruta también se pueden registrar incidencias (con fotos) y cargas de combustible (con foto del ticket).

| Foto | Tamaño máximo | Calidad JPEG |
|---|---|---|
| Reporte de contenedor (4 por punto) | 720 px | 0.5 |
| Odómetro, cierre, incidencias y ticket | 1024 px | 0.6 |

### Sin conexión

El APK funciona sin señal. El avance del día (despacho, inspección, puntos completados y borradores) se guarda en el teléfono y se recupera si la app se cierra; al día siguiente empieza de cero. La inspección, el inicio de ruta, cada reporte, incidencia y carga, y el cierre se guardan primero en una cola local y se envían a Supabase en orden al abrir la app, al recuperar la señal y cada 30 segundos. Mientras haya envíos pendientes, la parte superior de la pantalla muestra cuántos faltan.

- Cada registro conserva la hora en que se hizo en el teléfono (no la de envío), así que un reporte sincronizado después cuenta para el día y la ruta correctos. El servidor no acepta horas futuras.
- Cada reporte lleva un identificador generado en el teléfono; si un envío se repite, Supabase lo detecta como duplicado y no se registra dos veces.
- Si Supabase rechaza un registro con datos (reporte, inspección, incidencia, carga o evidencia de cierre), por ejemplo porque falta ejecutar `schema.sql` o crear el bucket de fotos, se queda en la cola y se reintenta sin detener los demás envíos; un inicio o cierre rechazado se descarta y se muestra el motivo.
- Las fotos se suben con un nombre derivado del identificador del registro, así que un envío repetido no las duplica.
- Los pendientes se pierden si se borran los datos de la app o se desinstala antes de sincronizar. Las fotos de cierre no se guardan en el teléfono antes de finalizar: si la app se cierra antes, se toman de nuevo.

Sin Supabase configurado, los reportes quedan registrados solo en el dispositivo y no se envía ninguna foto. Los borradores de reporte se descartan al iniciar una nueva salida.

## Flujo de administración

Abre `/?mode=admin` o elige **Administración** en la pantalla inicial. Se requiere iniciar sesión con una cuenta de Supabase registrada en `public.admin_users`; una cuenta autenticada sin ese permiso no puede abrir el panel.

1. **Consultar operación:** el resumen muestra reportes de contenedores registrados hoy y cobertura de puntos. Se sincroniza automáticamente con los cambios del panel de campo; también se puede usar **Actualizar** para sincronizar manualmente. **Ver todos** muestra el historial completo; desde cada reporte se consulta el detalle de llenado, peso, materiales, incidencias y las 4 fotos de evidencia.
2. **Revisar eventos de campo:** las secciones **Combustible**, **Inspecciones**, **Cierres de ruta** e **Incidencias** muestran los últimos 100 registros de cada tipo. Al abrir uno se ven su tripulación, sus datos y sus fotos, que se descargan solo en ese momento.
3. **Configurar rutas:** crea una ruta con nombre o zona y uno o más puntos, o edita/elimina una ruta existente. La tabla permite buscar por ruta, zona o punto, filtrar por estado y exportar las rutas a CSV.
4. **Programar rutas:** en **Programar rutas**, navega el calendario, selecciona un día para consultar los reportes de esa fecha o asigna una ruta. Las asignaciones solo se pueden editar para hoy o fechas futuras; cada día admite una ruta y una ruta puede repetirse en varios días. Si el día ya tiene una ruta, el panel pide confirmar antes de reemplazarla. La ruta de hoy queda bloqueada en cuanto campo la inicia; el calendario se actualiza solo por Realtime. En fechas pasadas el botón cambia a **Generar resumen**, que abre el resumen con un periodo personalizado de ese día. El panel de campo recibe la asignación automáticamente.
5. **Revisar visitas:** la tabla de puntos usa el reporte más reciente de cada contenedor para mostrar su última visita. Los reportes se sincronizan automáticamente; pulsa **Actualizar** para forzar una consulta.
6. **Generar resumen:** **Generar resumen** totaliza los reportes de un periodo diario, semanal (lunes a domingo), mensual o personalizado. Ver [Resumen de recolección](#resumen-de-recolección).
7. **Modo oscuro:** el botón **Modo oscuro** de la barra superior cambia el panel de administración a colores oscuros; no afecta la app de campo. La elección se guarda en el navegador; sin elección guardada, el panel sigue la configuración del sistema. El PDF del resumen siempre se imprime en claro. Los colores del panel están definidos como variables al inicio de `src/styles/admin-dashboard.css`, con su valor claro y oscuro.
8. **Cerrar sesión:** usa **Cerrar sesión** en la barra superior para salir del panel.

Las rutas se almacenan en `public.route_configurations`; las asignaciones por día, en `public.route_schedules`. El campo ya no permite elegir una ruta manualmente: usa la ruta asignada al día operativo de La Paz (`America/Mazatlan`) y no permite iniciar si no existe una. El panel descarga el historial completo una vez y después solo pide los reportes nuevos (por Realtime, cada 30 s o con **Actualizar**); al cerrar sesión se detienen esas sincronizaciones. Los reportes que llegan tarde desde un teléfono sin señal se detectan por `received_at` (hora de llegada) y se muestran según su hora de captura (`created_at`).

### Resumen de recolección

El resumen se calcula en el navegador con el historial ya cargado; no hace consultas extra a Supabase. Tiene dos vistas y dos exportaciones:

- **Documento:** indicadores generales, peso por material (gráfica de dona con porcentajes y tabla), recolección por fecha (tabla con reportes y kg de cada material por día; solo los días con recolección) y recolección por contenedor (tabla). Incluye espacio para las firmas de quien elaboró y revisó.
- **Tablero interactivo:** los mismos datos con indicadores, kilos por día, la dona de materiales y la lista de contenedores. Al pasar el mouse por una columna o un segmento se ven sus kilos; al elegir un material en la dona o en su lista, todo el tablero se filtra por ese material.
- **Exportar PDF:** abre el diálogo de impresión con el documento (aunque el tablero esté en pantalla); elige **Guardar como PDF**. Los colores de la gráfica se conservan.
- **Exportar tablero:** descarga `tablero-ruta-cero-<inicio>_<fin>.html`, el tablero interactivo del periodo en un solo archivo para enviarlo a alguien sin acceso al panel. Se abre con doble clic en cualquier navegador, funciona sin internet (los íconos necesitan conexión) y conserva los tooltips y el filtro por material; abre en el modo claro u oscuro del sistema de quien lo abre y tiene su propio botón **Modo oscuro** para cambiarlo. Solo contiene los totales del periodo exportado (sin fotos ni comentarios) y no se actualiza: para datos nuevos, exporta otra vez.
- **Exportar CSV:** descarga `ruta-cero-reportes-<inicio>_<fin>.csv`, listo para Power BI, Excel o herramientas similares.

Cada material tiene siempre el mismo color en todas las gráficas: plástico azul, cartón naranja y papel verde. Un material nuevo usaría amarillo; agrégalo a `materialOrder` en `src/screens/admin/Summary.js` para darle su propio color.

El CSV tiene **una fila por material de cada reporte**, con las columnas `reporte_id, fecha, fecha_hora, contenedor, punto, ruta, unidad, operador, auxiliar, nivel_llenado, material, kg, incidencias, comentarios`:

- Suma `kg` para obtener los totales; para contar reportes usa el **recuento distinto** de `reporte_id`, porque un reporte con varios materiales ocupa varias filas. Un reporte sin materiales aparece en una sola fila con `material` vacío.
- Las fechas van como `2026-10-20` y `2026-10-20 11:00:00` (hora de La Paz) y los kilos con punto decimal. Si Power BI está en una configuración regional con coma decimal, al importar elige **Inglés (Estados Unidos)**.
- El archivo es UTF-8 con BOM para que Excel muestre bien los acentos. Los textos que empiezan con `=`, `+`, `-` o `@` llevan un `'` delante para que la hoja de cálculo no los ejecute como fórmula.

## Requisitos

- Node.js 18 o superior (22 o superior para `npm test`)
- npm

## Instalación y ejecución

```bash
npm install
npm run dev
```

Vite iniciará el servidor en `http://localhost:5173`. La configuración permite acceder desde otros dispositivos de la red local.

> Para usar la cámara, abre la aplicación en `http://localhost:5173` en el mismo equipo. En un teléfono u otro equipo de la red, usa HTTPS; los navegadores bloquean la cámara en conexiones HTTP normales por IP y al abrir `index.html` directamente.

## Supabase para pruebas

1. Crea un proyecto en el plan gratuito de Supabase.
2. En el SQL Editor del proyecto, ejecuta el contenido de `supabase/schema.sql`.
3. Copia `.env.example` como `.env.local` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores del proyecto.
4. En **Authentication → Users**, crea una cuenta para el administrador y confirma el correo si el proyecto lo requiere.
5. En el SQL Editor, registra esa cuenta como administradora. Reemplaza el correo por el de la cuenta:

  ```sql
  insert into public.admin_users (user_id)
  select id from auth.users where email = 'admin@tu-dominio.com'
  on conflict (user_id) do nothing;
  ```

6. Reinicia Vite con `npm run dev`. Abre `http://localhost:5173/?mode=admin` e inicia sesión con esa cuenta. El panel carga los reportes de `public.container_reports` en páginas para mostrar el historial completo.

En **Rutas configuradas**, crea o edita las rutas y sus puntos. En **Programar rutas**, usa el calendario para asignar una ruta a cada fecha; la ruta de hoy aparece automáticamente en despacho y el mapa de campo. Ejecuta de nuevo `supabase/schema.sql` para crear la tabla de calendario, actualizar las funciones RPC (que ahora aceptan la hora del dispositivo), agregar la columna `received_at` y habilitar las notificaciones Realtime de los reportes; las asignaciones anteriores se migran cuando es posible.

La clave `anon`/publishable está diseñada para usarse en el cliente; nunca pongas la clave `service_role` en estas variables. Los reportes solo se pueden leer con una sesión cuya cuenta esté registrada en `admin_users`; la inserción de reportes anónimos sigue habilitada para pruebas. Sin variables configuradas, la aplicación sigue funcionando en modo local.

### Datos simulados

Para probar el resumen, el tablero, el calendario y los eventos de campo sin salir a ruta, ejecuta `supabase/simulated-data.sql` en el SQL Editor (después de `schema.sql`). Crea dos rutas (`SIM-R1` y `SIM-R2`) y, para los últimos 120 días sin contar hoy ni los domingos, un reporte por contenedor (sin fotos), inspecciones, cierres, cargas de combustible y algunas incidencias. Los kilos cambian cada día (más los lunes, menos los sábados) y la proporción de cartón y papel también, para que las gráficas muestren variación.

- Se puede volver a ejecutar: primero borra la simulación anterior y genera datos nuevos.
- En el calendario solo ocupa días libres, así que no reemplaza asignaciones reales.
- Todo lo simulado usa ids que empiezan con `SIM-`. Para quitarlo, ejecuta solo el bloque **Limpieza** del final del archivo.

### Fotos en Storage

`schema.sql` crea el bucket privado `field-photos` (solo JPEG, máximo 1 MB por archivo) y sus permisos: la app de campo solo puede subir archivos y únicamente las cuentas de `admin_users` pueden leerlos. Cada foto se guarda como `<tabla>/<id del registro>/<nombre>.jpg`; por ejemplo, `container_reports/<id>/initialExterior.jpg`. Las filas guardadas antes de usar Storage contienen la imagen como texto (data URL) y el panel las sigue mostrando.

En el plan gratuito, Storage tiene 1 GB, aparte de los 500 MB de la base de datos. Una ruta de 3 puntos ocupa alrededor de 1 MB de fotos.

## Reiniciar la base de datos

Borra de forma permanente reportes, fotos, rutas, calendario y personal. El plan gratuito de Supabase no tiene respaldos restaurables: si necesitas conservar algo, exporta antes las tablas a CSV desde el **Table Editor**.

1. **Vacía la cola de los teléfonos.** Antes de borrar, confirma que ningún teléfono tenga envíos pendientes (el contador de la parte superior en 0). Lo que quede en una cola se volvería a subir después del reinicio. Para dejar un teléfono limpio, borra los datos de la app (**Ajustes → Apps → Ruta Cero → Almacenamiento → Borrar datos**) o, en la versión web, los datos del sitio. En iPhone, elimina el ícono de la pantalla de inicio y vuelve a agregarlo desde Safari.
2. **Borra los datos.** En el SQL Editor ejecuta:

  ```sql
  -- Conserva admin_users, que da acceso al panel.
  truncate table
    public.container_reports,
    public.incident_reports,
    public.fuel_loads,
    public.dispatch_inspections,
    public.route_completions,
    public.route_schedules,
    public.route_configurations,
    public.fleet_resources
  restart identity cascade;

  -- Los identificadores vuelven a empezar (R-01, U-001, OP-001, AUX-001).
  alter sequence public.route_id_seq restart;
  alter sequence public.fleet_unit_id_seq restart;
  alter sequence public.fleet_driver_id_seq restart;
  alter sequence public.fleet_assistant_id_seq restart;
  ```

  Reinicia los identificadores solo si borras también los reportes; si no, un reporte antiguo quedaría ligado a la ruta o persona nueva que reciba el mismo id.
3. **Borra las fotos de Storage.** Supabase no permite borrar archivos de Storage con SQL. En el panel de Supabase abre **Storage → `field-photos`** y, en el menú del bucket, elige **Empty bucket**. No elimines el bucket: si lo haces, ejecuta de nuevo `supabase/schema.sql` para crearlo.
4. **Recarga el panel de administración.** Toma las rutas y el personal de Supabase, así que se muestra vacío.

Para borrar solo los registros de campo y conservar rutas y personal, deja en el `truncate` únicamente `container_reports`, `incident_reports`, `fuel_loads`, `dispatch_inspections` y `route_completions`, no reinicies los identificadores y vacía igualmente el bucket.

## Despliegue en Vercel

En el proyecto de Vercel, abre **Settings → Environment Variables** y define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores de **Project URL** y la clave publishable/anon del proyecto correcto de Supabase. Añádelas para cada entorno que uses (Production, Preview o Development) y vuelve a desplegar: Vite incorpora estas variables durante la compilación. No uses la clave `service_role` en el frontend.

Antes de guardar reportes, ejecuta `supabase/schema.sql` en el SQL Editor de ese mismo proyecto de Supabase. Si el guardado falla, el aviso de la aplicación muestra el código o mensaje devuelto por Supabase para distinguir errores de tabla, permisos y conexión.

## Instalar en iPhone (Safari)

En iPhone no hay APK: el panel de campo se instala desde Safari como app web, con su ícono en la pantalla de inicio y abriendo a pantalla completa.

1. En Safari, abre la dirección publicada en Vercel con `/?mode=field` al final (por ejemplo, `https://tu-proyecto.vercel.app/?mode=field`). Hazlo con señal, para que la app quede guardada y luego abra sin conexión.
2. Toca **Compartir** (el cuadro con una flecha hacia arriba). En iOS 26, primero toca **⋯** en la barra y luego **Compartir**.
3. Desliza hacia abajo y elige **Agregar a inicio**.
4. Deja activado **Abrir como app web** si aparece, revisa que el nombre sea **Ruta Cero** y toca **Agregar**.
5. Abre la app desde el nuevo ícono, no desde Safari. La primera vez que tomes una foto o escanees un código, permite el acceso a la cámara.

- Se necesita HTTPS (Vercel ya lo usa); desde una dirección `http://` por IP la cámara no funciona.
- La app instalada guarda sus datos aparte de Safari: el avance del día y los envíos pendientes están en la app, no en las pestañas del navegador.
- **No elimines el ícono mientras haya envíos pendientes**: al quitarlo, iOS borra los datos de la app, incluida la cola de envíos.
- Las actualizaciones se aplican solas al abrir la app con señal; si no aparece un cambio, ciérrala por completo y ábrela de nuevo.

## Comandos disponibles

```bash
npm run dev      # Servidor de desarrollo con recarga en caliente
npm run build    # Genera la versión optimizada en dist/
npm run build:android  # Compila solo el panel de campo y lo copia al proyecto Android
npm run preview  # Sirve localmente la compilación de producción
npm test         # Ejecuta las pruebas de tests/ con el runner de Node
```

Para probar la compilación de producción:

```bash
npm run build
npm run preview
```

## APK de Android

El APK contiene únicamente el panel de campo: `npm run build:android` compila con `vite build --mode android`, que abre siempre el modo campo y deja fuera del paquete la pantalla inicial y el panel de administración. Después de ejecutarlo, genera el APK desde Android Studio (`npx cap open android`). No uses `npm run build` + `npx cap sync` para el APK, porque esa compilación incluye el panel de administración.

## Estructura principal

```text
.
├── design-system/       # Documentación y tokens del sistema visual
├── public/              # Favicon
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── data/            # Catálogos fijos (puntos, inspección, combustible)
│   ├── domain/          # Lógica de negocio pura (inspección, reportes, rutas)
│   ├── screens/         # Pantallas operativas
│   │   └── admin/       # Secciones del panel de administración
│   ├── services/        # Supabase y configuración de rutas
│   ├── state/           # Store inmutable central
│   ├── styles/          # Tokens y estilos por modo
│   ├── utils/           # HTML, íconos y formato de horas
│   ├── fieldApp.js      # Shell y ciclo de renderizado del modo campo
│   └── main.js          # Entrada: elige el modo y carga su código
├── supabase/            # Esquema SQL (tablas, funciones, permisos y bucket de fotos) y datos simulados
├── tests/               # Pruebas (node --test)
├── index.html
├── package.json
└── vite.config.js
```

## Diseño visual

Field-Spec prioriza legibilidad en cabina y uso con guantes: tipografías Barlow Condensed y Atkinson Hyperlegible Next, controles táctiles de al menos 48 px, bordes rectos, alto contraste y colores semánticos para plástico, cartón y papel.
