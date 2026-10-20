# Ruta Cero

Plataforma operativa para coordinar las rutas urbanas de recolección de residuos de Ruta Cero. Incluye una aplicación móvil de campo para preparar unidades, recorrer rutas y registrar recolecciones, además de un panel de administración para configurar recorridos y consultar reportes.

## Arquitectura

- **Frontend:** JavaScript vanilla con módulos ES.
- **Build y servidor local:** Vite 6.
- **Entrada:** `index.html` carga `src/main.js`.
- **Arranque por modo:** `main.js` solo decide el modo (`entry`, `field` o `admin`) y carga con `import()` el código y el CSS de ese modo. El panel de administración, el lector de códigos (ZXing) y Supabase no se descargan en las pantallas que no los usan.
- **Renderizado:** cada pantalla expone `renderX(state)`, que devuelve HTML, y `attachX(el, store)`, que monta sus eventos y puede devolver una función de limpieza (temporizadores, cámara). `src/fieldApp.js` es el shell del modo campo: elige la pantalla activa, ejecuta la limpieza de la anterior y vuelve a dibujar cuando cambia el estado.
- **Estado:** `src/state/store.js` contiene un store inmutable en memoria: cada acción crea un estado nuevo y avisa a los suscriptores. Incluye los borradores de reporte por contenedor, para que una actualización de la ruta o la cámara no borre lo capturado. La configuración de rutas se comparte mediante `public.route_configurations` en Supabase y se mantiene en caché local.
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
4. **Iniciar y recorrer:** inicia la ruta desde Despacho. El mapa muestra el punto activo, el avance y los puntos programados; ofrece abrir indicaciones en Google Maps.
5. **Identificar el contenedor:** escanea el código QR o código de barras del punto activo. Si la cámara no logra leerlo, se puede elegir manualmente el mismo punto activo. Los códigos de otros puntos no permiten avanzar.
6. **Registrar la recolección:** toma fotos iniciales y finales del exterior e interior, indica el nivel de llenado y registra materiales, peso por material e incidencias. Para nivel medio o lleno se requiere al menos un material con peso mayor que cero; para nivel bajo no hace falta registrar material.
7. **Guardar y continuar:** guarda el reporte. El punto queda completado y el mapa activa el siguiente; al completar todos los contenedores de cualquier ruta, se agrega la estación de regreso y se muestran sus indicaciones en el mapa.
8. **Finalizar la ruta:** al llegar a la estación, captura la evidencia fotográfica de regreso y confirma el cierre para volver a Despacho.

El avance operativo de campo vive en el store en memoria del dispositivo. Los reportes se insertan en Supabase cuando está configurado; si no lo está, quedan registrados solo durante la sesión local. La evidencia fotográfica de cierre se conserva en el estado de la sesión; de la foto del odómetro solo se registra que fue tomada, la imagen todavía no se guarda. Los borradores de reporte se descartan al iniciar una nueva salida.

## Flujo de administración

Abre `/?mode=admin` o elige **Administración** en la pantalla inicial. Se requiere iniciar sesión con una cuenta de Supabase registrada en `public.admin_users`; una cuenta autenticada sin ese permiso no puede abrir el panel.

1. **Consultar operación:** el resumen muestra reportes de contenedores registrados hoy y cobertura de puntos. Se sincroniza automáticamente con los cambios del panel de campo; también se puede usar **Actualizar** para sincronizar manualmente. **Ver todos** muestra el historial completo; desde cada reporte se consulta el detalle de llenado, peso, materiales, incidencias y evidencia.
2. **Configurar rutas:** crea una ruta con nombre o zona y uno o más puntos, o edita/elimina una ruta existente. La tabla permite buscar por ruta, zona o punto, filtrar por estado y exportar las rutas a CSV.
3. **Programar rutas:** en **Programar rutas**, navega el calendario, selecciona un día para consultar los reportes de esa fecha o asigna una ruta. Las asignaciones solo se pueden editar para hoy o fechas futuras; cada día admite una ruta y una ruta puede repetirse en varios días. El panel de campo recibe la asignación automáticamente.
4. **Revisar visitas:** la tabla de puntos usa el reporte más reciente de cada contenedor para mostrar su última visita. Los reportes se sincronizan automáticamente; pulsa **Actualizar** para forzar una consulta.
5. **Cerrar sesión:** usa **Cerrar sesión** en la barra superior para salir del panel.

Las rutas se almacenan en `public.route_configurations`; las asignaciones por día, en `public.route_schedules`. El campo ya no permite elegir una ruta manualmente: usa la ruta asignada al día operativo de La Paz (`America/Mazatlan`) y no permite iniciar si no existe una. El panel descarga el historial completo una vez y después solo pide los reportes nuevos (por Realtime, cada 30 s o con **Actualizar**); al cerrar sesión se detienen esas sincronizaciones. La sesión de campo no se restaura al recargar la aplicación.

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

En **Rutas configuradas**, crea o edita las rutas y sus puntos. En **Programar rutas**, usa el calendario para asignar una ruta a cada fecha; la ruta de hoy aparece automáticamente en despacho y el mapa de campo. Ejecuta de nuevo `supabase/schema.sql` para crear la tabla de calendario, actualizar las funciones RPC y habilitar las notificaciones Realtime de los reportes; las asignaciones anteriores se migran cuando es posible.

La clave `anon`/publishable está diseñada para usarse en el cliente; nunca pongas la clave `service_role` en estas variables. Los reportes solo se pueden leer con una sesión cuya cuenta esté registrada en `admin_users`; la inserción de reportes anónimos sigue habilitada para pruebas. Las fotos se registran actualmente como datos de evidencia, no como archivos de imagen. Sin variables configuradas, la aplicación sigue funcionando en modo local.

## Despliegue en Vercel

En el proyecto de Vercel, abre **Settings → Environment Variables** y define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores de **Project URL** y la clave publishable/anon del proyecto correcto de Supabase. Añádelas para cada entorno que uses (Production, Preview o Development) y vuelve a desplegar: Vite incorpora estas variables durante la compilación. No uses la clave `service_role` en el frontend.

Antes de guardar reportes, ejecuta `supabase/schema.sql` en el SQL Editor de ese mismo proyecto de Supabase. Si el guardado falla, el aviso de la aplicación muestra el código o mensaje devuelto por Supabase para distinguir errores de tabla, permisos y conexión.

## Comandos disponibles

```bash
npm run dev      # Servidor de desarrollo con recarga en caliente
npm run build    # Genera la versión optimizada en dist/
npm run preview  # Sirve localmente la compilación de producción
npm test         # Ejecuta las pruebas de tests/ con el runner de Node
```

Para probar la compilación de producción:

```bash
npm run build
npm run preview
```

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
├── supabase/            # Esquema SQL
├── tests/               # Pruebas (node --test)
├── index.html
├── package.json
└── vite.config.js
```

## Diseño visual

Field-Spec prioriza legibilidad en cabina y uso con guantes: tipografías Barlow Condensed y Atkinson Hyperlegible Next, controles táctiles de al menos 48 px, bordes rectos, alto contraste y colores semánticos para plástico, cartón y papel.
