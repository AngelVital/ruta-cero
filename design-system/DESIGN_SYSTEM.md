# Field-Spec HUD — Sistema de Diseño para Ruta Cero

> **Proyecto Stitch ID**: `13352991854495087010`  
> **Nombre del Sistema**: Field-Spec HUD  
> **Área**: Logística Operativa de Recolección de Residuos Urbanos  
> **Dispositivo Principal**: Terminal Móvil Rugerizada / Smartphone en Cabina

---

## 1. Filosofía y Estilo de Marca

El sistema de diseño **Field-Spec HUD** está diseñado específicamente para operarios de campo en logística de residuos y reciclaje municipal. Los trabajadores operan a la intemperie bajo condiciones climáticas adversas: luz solar directa del mediodía, lluvia, equipo de protección reflectante y guantes industriales gruesos.

El diseño rechaza el embellecimiento innecesario, los radios decorativos y las sutilezas de bajo contraste, priorizando:
- **Utilidad nítida**: Jerarquías visuales asertivas y reconocimiento visual instantáneo.
- **Tono operacional**: Confiable, legible sin compromisos y funcional. Cada pulsación es una confirmación de campo donde un error de lectura o un toque fallido genera retrasos reales.
- **Verde Esmeralda de Campo (`#00A86B`)**: Señal de salud operativa y flujos primarios, sobre una base estructural de pizarra profunda (`#0F172A`).
- **Indicadores Semánticos de Material**: Colores puros y saturados para segregación inmediata (`Plástico`, `Cartón`, `Papel`).

---

## 2. Paleta de Colores

### 2.1 Base Estructural y Operacional
| Nombre del Token | Hex | Uso en HUD |
|---|---|---|
| `--color-primary` | `#006D43` | Acción primaria base / encabezados activos |
| `--color-primary-container` | `#00A86B` | Verde esmeralda de confirmación y estado óptimo |
| `--color-on-primary` | `#FFFFFF` | Texto sobre botón primario |
| `--color-surface` | `#F8F9FF` | Fondo general de la aplicación |
| `--color-surface-container-lowest` | `#FFFFFF` | Superficie de tarjetas y paneles de datos |
| `--color-surface-container` | `#E6EEFF` | Contenedores secundarios y fondos de badges |
| `--color-surface-container-high` | `#DCE9FF` | Resaltes de tarjetas activas |
| `--color-on-surface` | `#0D1C2E` | Texto principal de máximo contraste |
| `--color-on-surface-variant` | `#3D4A41` | Texto secundario y etiquetas de metadatos |
| `--color-outline` | `#0F172A` / `#6D7A70` | Bordes estructurales rígidos |
| `--color-outline-variant` | `#BCCABE` | Divisores secundarios |

### 2.2 Clasificación de Residuos (Material Badges)
| Material | Color Primario | Uso |
|---|---|---|
| **Plástico** | `#0284C7` (Cyan 600) | Contenedores de envases y PET |
| **Cartón** | `#D97706` (Amber 600) | Contenedores de cartón y embalaje |
| **Papel** | `#4F46E5` (Indigo 600) | Contenedores de papel y celulosa |

### 2.3 Capacidad y Semáforo Operativo
| Nivel | Rango | Color | Estado |
|---|---|---|---|
| **Bajo / Óptimo** | 0% – 50% | `#00A86B` | Capacidad regular, vaciado no urgente |
| **Medio / Alerta** | 51% – 75% | `#EAB308` | Nivel preventivo de recolección |
| **Crítico / Lleno** | > 75% | `#E11D48` | Alerta máxima, requiere vaciado prioritario |

---

## 3. Tipografía

El sistema divide la tipografía en dos roles especializados de alta demanda cognitiva:

### 3.1 Barlow Condensed (Titulares y Métricas Críticas)
Inspirada en señalética industrial, placas de transporte y tableros de vehículos de servicio pesado. La geometría condensada permite etiquetas de gran impacto horizontal sin truncar nombres largos (e.g., `CONT-04 MALECÓN NORTE`).

- **Display**: 44px / Line-Height 48px / Peso 700 / Espaciado 0.02em
- **Headline Large**: 32px / Line-Height 36px / Peso 700 / Espaciado 0.03em
- **Headline Medium**: 22px / Line-Height 26px / Peso 600 / Espaciado 0.02em
- **Headline Small**: 18px / Line-Height 22px / Peso 600 / Espaciado 0.04em
- **Label Large / Medium**: 16px / 14px / Peso 700 en **MAYÚSCULAS** con tracking generoso.

### 3.2 Atkinson Hyperlegible Next (Lectura y Coordenadas GPS)
Diseñada para máxima diferenciación de caracteres bajo deslumbramiento solar (`1`, `l`, `I`, `0`, `O`).
- **Body Large**: 18px / Line-Height 26px / Peso 400
- **Body Medium**: 16px / Line-Height 24px / Peso 400
- **Body Small**: 14px / Line-Height 20px / Peso 500

---

## 4. Filosofía de Forma y Elevación Táctil

### 4.1 Arquitectura Sharp (0px Radius)
Todos los componentes emplean **0px de radio en bordes**. Los ángulos rectos maximizan la superficie útil para botones dentro de las áreas táctiles del operario y eliminan zonas muertas de toque.

### 4.2 Modelo de Profundidad Mecánica (Mechanical Depress)
En luz solar directa, las sombras difusas convencionales (blur) pierden todo contraste. Este sistema utiliza sombras duras y mecánicas sin desenfoque:

```css
/* Estado Base */
border: 2px solid #0F172A;
box-shadow: 4px 4px 0px #0F172A;

/* Estado Activo (Pulsación) */
transform: translate(2px, 2px);
box-shadow: 2px 2px 0px #0F172A;
```

---

## 5. Reglas de Interacción para Operarios con Guantes

1. **Touch Target Mínimo**: Cualquier botón, pestaña o selector mide al menos **48px** en su eje más corto.
2. **Acciones de Alta Frecuencia**: Botones de confirmación y navegación principal miden entre **52px y 60px**.
3. **Separación de Seguridad**: Espaciado mínimo de **8px** entre elementos interactivos adyacentes para evitar pulsaciones accidentales por vibración del camión.
