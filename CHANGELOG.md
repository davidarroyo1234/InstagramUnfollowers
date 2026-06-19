# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-06-16

### Added
- **Pending Requests Management:** Upload the `pending_follow_requests.json` export to scan and cancel the ones you have sent.
- **Batch Scanning:** Scan in batches (20 / 50 / 100 / All) with "Stop", "Pause" and "Resume".
- **Anti-Rate-Limit Pacing:** Randomized delays, periodic pauses, and a cooldown after a `429` to avoid temporary blocks.
- **Whitelist & Export:** Per-account whitelist plus full-list export to JSON, CSV or the clipboard.
- **CSP-Safe Avatars:** Inline SVG initials fallback (`data:` URL) when no profile picture is available, so no images load from external services.

## [1.2.0] - 2026-04-04

### Added
- **Whitelist Star Button:** Dedicated star (★) button on each profile row for instant whitelist management.
- **Sticky Actions:** The "UNFOLLOW" button is now fixed at the bottom of the sidebar for constant accessibility.
- **Anti-Detection Measures:** Randomized micro-pauses (500ms-2k ms) and dynamic sleep cycles (+/- 5s randomization) to mimic human behavior and avoid Instagram rate limits.
- **Data Persistence:** Whitelist state and scan timing settings are now saved in `localStorage`.

### Changed
- **UI Density:** Restructured sidebar layout to be more compact. Combined "Pause" and "Pagination" into a single row.
- **Grid Layouts:** Filters and Smart Select buttons are now organized in a 2-column grid, reducing vertical height by 50%.
- **Scan Summary:** Modernized the summary layout with a 3-column grid and clearer labels ("Private" instead of "P").
- **Visuals:** Updated sidebar with glassmorphism effects and optimized scrollbars.

## [1.1.0] - 2026-03-10

### Added
- **Smart Selection (UX Improvements):**
  - Added "Select Verified" button to quickly select all verified users.
  - Added "Select Private" button to select all private accounts.
  - Added "Select No Profile Pic" button to identify and select users without a profile picture (useful for bot cleanup).
  - Added "Clear Selection" button to reset the current unfollow queue.
- **Data Exporting Tools:**
  - Added "JSON Export" button in the toolbar to download filtered results as a JSON file.
  - Added "CSV Export" button in the toolbar to download filtered results as a CSV file (compatible with Excel).
- **Profile Preview:**
  - Implemented high-quality avatar preview on hover. Passing the mouse over a user's avatar now shows a large, clear version of their profile picture.
- **Style Enhancements:**
  - Created `_ux_improvements.scss` with refined button styles, layout gaps, and preview animations.

### Changed
- **Technical Robustness:**
  - Refactored selection logic to be 100% compatible with ES5 (fixing Set iteration errors in older browsers).
  - Improved TypeScript typings across all Icon components.
  - Optimized `getUsersForDisplay` utility with new helper functions.

### Fixed
- Fixed issues where the build would fail due to missing dependencies (restored via `npm install`).
- Fixed several "Implicit Any" and JSX typing errors in the component tree.

---

## [1.0.0] - Initial Release
- Core scanning functionality.
- Whitelist management.
- Basic unfollow automation.
- Timing settings to prevent rate limits.

---

# Historial de Cambios (Spanish)

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [1.3.0] - 2026-06-16

### Añadido
- **Gestión de Solicitudes Pendientes:** Sube el export `pending_follow_requests.json` para escanear y cancelar las que has enviado.
- **Escaneo por Tandas:** Escanea por lotes (20 / 50 / 100 / All) con "Stop", "Pause" y "Resume".
- **Ritmo Anti-Bloqueo:** Retardos aleatorios, pausas periódicas y un enfriamiento tras un `429` para evitar bloqueos temporales.
- **Whitelist y Exportación:** Lista blanca por cuenta y exportación de toda la lista a JSON, CSV o el portapapeles.
- **Avatares CSP-Safe:** Iniciales en SVG en línea (`data:` URL) cuando no hay foto de perfil, sin cargar imágenes de servicios externos.

## [1.2.0] - 2026-04-04

### Añadido
- **Botón de Estrella (Whitelist):** Botón (★) dedicado en cada usuario para añadir o quitar de la lista blanca al instante.
- **Acciones Fijas:** El botón "UNFOLLOW" ahora está fijado en la parte inferior del lateral para que siempre esté accesible.
- **Medidas Anti-Detección:** Micro-pausas aleatorias (500ms-2k ms) y ciclos de espera dinámicos (variación de +/- 5s) para imitar comportamiento humano y evitar bloqueos.
- **Persistencia de Datos:** El estado de la Whitelist y la configuración de tiempos ahora se guardan en el navegador (`localStorage`).

### Cambiado
- **Densidad de UI:** Reestructurado el panel lateral para que sea más compacto. Botón de "Pausa" y "Paginación" ahora comparten fila.
- **Diseño en Rejilla:** Los filtros y botones de selección inteligente ahora están en modo 2 columnas, reduciendo la altura vertical un 50%.
- **Resumen de Escaneo:** Diseño de resumen en 3 columnas y etiquetas más claras ("Private" en lugar de "P").
- **Estética:** Actualizado el lateral con efectos de desenfoque (glassmorphism) y optimización de barras de scroll.

## [1.1.0] - 2026-03-10

### Añadido
- **Selecciones Inteligentes (Mejoras de UX):**
  - Botón "Select Verified" para seleccionar rápidamente a todos los usuarios verificados.
  - Botón "Select Private" para seleccionar todas las cuentas privadas.
  - Botón "Select No Profile Pic" para identificar y seleccionar usuarios sin foto de perfil (útil para limpiar bots).
  - Botón "Clear Selection" para reiniciar la cola de unfollow actual.
- **Herramientas de Exportación de Datos:**
  - Botón "JSON Export" en la barra de herramientas para descargar los resultados filtrados como archivo JSON.
  - Botón "CSV Export" en la barra de herramientas para descargar los resultados filtrados como archivo CSV (compatible con Excel).
- **Previsualización de Perfil:**
  - Implementación de previsualización de avatares en alta calidad al pasar el ratón. Al poner el cursor sobre el avatar de un usuario, ahora se muestra una versión grande y clara de su foto de perfil.
- **Mejoras de Estilo:**
  - Creado `_ux_improvements.scss` con estilos de botones refinados, ajustes de espaciado y animaciones para la previsualización.

### Cambiado
- **Robustez Técnica:**
  - Refactorizada la lógica de selección para ser 100% compatible con ES5 (corrigiendo errores de iteración de `Set` en navegadores antiguos).
  - Mejorados los tipados de TypeScript en todos los componentes de Iconos.
  - Optimizado el servicio `getUsersForDisplay` con nuevas funciones de ayuda.

### Solucionado
- Corregidos problemas donde la compilación fallaba debido a dependencias faltantes (restauradas vía `npm install`).
- Solucionados varios errores de "Implicit Any" y tipado de JSX en el árbol de componentes.

---

## [1.0.0] - Lanzamiento Inicial
- Funcionalidad principal de escaneo.
- Gestión de lista blanca (Whitelist).
- Automatización básica de unfollow.
- Configuración de tiempos para evitar límites de Instagram.
