# Changelog

All notable changes to this project will be documented in this file.

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
