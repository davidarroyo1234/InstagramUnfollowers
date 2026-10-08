# 📱 Instagram Unfollowers

[![Maintenance](https://img.shields.io/maintenance/yes/2026)](https://github.com/davidarroyo1234/InstagramUnfollowers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🇬🇧 English](#-english) | [🇪🇸 Español](#-español)

---

<a name="-english"></a>
## 🇬🇧 English

A nifty tool that lets you see who doesn't follow you back on Instagram.  
<u>Browser-based and requires no downloads or installations!</u>

> ⚡ **Live Streaming & Fast Cache:** Accounts now appear dynamically on screen in real time as batches are fetched from Instagram. In addition, completed scans are cached locally so you can reload your audit instantly (0ms) without making unnecessary API calls!

### 🖥️ Desktop Usage

1. Copy the code from: [InstagramUnfollowers Tool](https://davidarroyo1234.github.io/InstagramUnfollowers/)
2. Press the COPY button to copy the code:
   <br/><img src="./assets/copy_code.png" alt="Copy code button" />
3. Go to the Instagram website and log in to your account.
4. Open the developer console:
   - Windows / Linux: `Ctrl + Shift + J`
   - Mac OS: `⌘ + ⌥ + I`
5. Paste the code into the console and press `Enter`. You'll see this interface:
   <br/><img src="./assets/initial.png" alt="Initial screen" />
6. Click **"Run Scan"** to start scanning (or **"⚡ Load previous scan"** to open your saved results instantly).
7. As scanning runs, accounts appear live on screen, and follow-back status updates automatically:
   <br/><img src="./assets/results.png" alt="Results screen" />
8. 🤍 **Whitelist users** by clicking their profile image.
9. 🌐 **Switch language** anytime between English and Spanish using the `🌐 EN / ES` button in the top bar.
10. 💾 **Manage your whitelist** via Settings:
    - Export: Save your whitelist as a JSON backup file
    - Import: Restore or merge whitelisted users from a file
    - Paste: Bulk-paste usernames directly into your protected whitelist
    - Clear: Remove all users from whitelist
    <br/><img src="./assets/settings_whitelist.png" alt="Settings screen" />
11. ✅ **Select users** to unfollow using the checkboxes.
12. ⚙️ **Customize script timings and language** via the "Settings" button:
    <br/><img src="./assets/settings.png" alt="Settings screen" />

### 📱 Mobile Usage

For Android users who want to use it on mobile:
1. Download the latest version of [Eruda Android Browser](https://github.com/liriliri/eruda-android/releases/)
2. Open Instagram web through the Eruda browser
3. Follow the same steps as desktop (the console will be automatically available when clicking the Eruda icon)

### ✨ Features

- 🔍 **Scan & Detect**: Accurately identifies users who don't follow you back.
- ⚡ **Live Progressive Streaming**: Accounts stream dynamically onto your screen as each batch arrives, eliminating blank waiting screens on large accounts.
- ⚡ **Instant Local Cache (0ms load)**: Re-open and review previously completed audits instantly without re-scraping from scratch.
- 🌐 **Bilingual (EN / ES)**: Native English and Spanish support with instant switching.
- 🛡️ **Anti-Ban & Session Protection**: Uses full Instagram Web headers (`X-ASBD-ID`, `X-CSRFToken`, `XMLHttpRequest`) to prevent forced logouts and suspicious activity flags.
- 🛡️ **Action-Block Guard**: Double-checks unfollow API responses to prevent ghost unfollows; halts the queue automatically if Instagram returns `feedback_required` to protect your account.
- ⏳ **Smart Rate-Limit & Soft-Block Backoff**: Automatically pauses and retries if Instagram returns HTTP 429 or HTTP 400 (`feedback_required`) with exponential cooldowns instead of failing.
- ⚠️ **Wrong-Detect Guard**: Expanded page limits supporting accounts with tens of thousands of followers, with safe lock preventing accidental unfollows if a scan is interrupted.
- 🤍 **Persistent & Bulk Whitelist**: Protect specific accounts with local persistence, JSON export/import, and direct username list pasting.
- ⚙️ **Customizable Timings**: Control request pacing to match your account safety preferences.
- 🎨 **Apple-inspired UI**: Clean, responsive, and minimalist interface.
- 🔒 **100% Client-Side Privacy**: All data is processed locally in your browser. No credentials or data are sent to external servers.

### 🛠️ Development

- Node version: Node 16+ / Node 18+ / Node 20+
- Install dependencies: `npm install`
- Build: `npm run build`
- Dev server with live reload: `npm run build-dev`
- Do not edit `public/index.html` manually: it is regenerated automatically by GitHub Actions, and PRs that modify it are rejected.

---

<a name="-español"></a>
## 🇪🇸 Español

Una herramienta práctica y ligera que te permite ver quién no te sigue de vuelta en Instagram.  
<u>¡Funciona directamente en tu navegador y no requiere descargas ni instalaciones externas!</u>

> ⚡ **Transmisión en vivo y caché rápido:** Ahora las cuentas aparecen dinámicamente en pantalla en tiempo real a medida que se descargan los lotes de Instagram. Además, los escaneos completados se guardan localmente para recargar tu lista al instante (0ms) sin hacer peticiones innecesarias.

### 🖥️ Uso en Computadora (Escritorio)

1. Copia el código desde la página oficial: [Herramienta InstagramUnfollowers](https://davidarroyo1234.github.io/InstagramUnfollowers/)
2. Presiona el botón **COPY** para copiar el script.
   <br/><img src="./assets/copy_code.png" alt="Botón copiar código" />
3. Entra a Instagram en tu navegador e inicia sesión en tu cuenta.
4. Abre la consola de desarrollador:
   - Windows / Linux: `Ctrl + Shift + J`
   - Mac OS: `⌘ + ⌥ + I`
5. Pega el código en la consola y presiona `Enter`. Verás la interfaz:
   <br/><img src="./assets/initial.png" alt="Pantalla inicial" />
6. Haz clic en **"Iniciar Escaneo"** para comenzar (o **"⚡ Cargar escaneo anterior"** para ver tus resultados guardados al instante).
7. Durante el escaneo, las cuentas se muestran en vivo y el estado de seguimiento se actualiza en tiempo real:
   <br/><img src="./assets/results.png" alt="Pantalla de resultados" />
8. 🤍 **Agrega cuentas a la lista blanca** haciendo clic sobre su foto de perfil para protegerlas.
9. 🌐 **Cambia el idioma** entre Español e Inglés en cualquier momento con el botón `🌐 ES / EN` en la barra superior.
10. 💾 **Administra tu lista blanca** desde Ajustes:
    - Exportar: Guarda tu lista blanca como respaldo en un archivo JSON.
    - Importar: Restaura o combina cuentas desde un archivo de respaldo.
    - Pegar: Pega listas de nombres de usuario para protegerlos directamente.
    - Borrar: Limpia la lista blanca cuando lo desees.
    <br/><img src="./assets/settings_whitelist.png" alt="Pantalla de ajustes de lista blanca" />
11. ✅ **Selecciona los usuarios** que deseas dejar de seguir usando las casillas de verificación.
12. ⚙️ **Personaliza los tiempos de espera y el idioma** desde el botón de "Ajustes":
    <br/><img src="./assets/settings.png" alt="Pantalla de configuración" />

### 📱 Uso en Móvil (Android)

Para usuarios de Android que quieran utilizarlo desde el móvil:
1. Descarga la última versión de [Eruda Android Browser](https://github.com/liriliri/eruda-android/releases/)
2. Abre la versión web de Instagram a través del navegador Eruda.
3. Sigue los mismos pasos que en la computadora (la consola estará disponible al tocar el ícono de Eruda).

### ✨ Características Principales

- 🔍 **Detección precisa**: Encuentra rápidamente a quienes sigues pero no te siguen de vuelta.
- ⚡ **Carga progresiva en vivo**: Las cuentas aparecen en pantalla en tiempo real mientras se descargan, evitando pantallas en blanco en cuentas con muchos seguidos.
- ⚡ **Caché local instantáneo (0ms)**: Carga escaneos anteriores con un solo clic desde la pantalla inicial sin hacer peticiones innecesarias.
- 🌐 **Soporte Bilingüe (Español / Inglés)**: Interfaz completamente en español e inglés con cambio instantáneo.
- 🛡️ **Protección antibloqueo y anti-cierre de sesión**: Envía cabeceras completas de Instagram Web (`X-ASBD-ID`, `X-CSRFToken`, `XMLHttpRequest`) para evitar alertas de actividad sospechosa y cierres de sesión forzados.
- 🛡️ **Protección contra bloqueos de acción (Action Block)**: Verifica la respuesta real de la API de Instagram al dejar de seguir evitando falsos éxitos ("ghost unfollows"); detiene la cola automáticamente ante `feedback_required` para proteger tu cuenta de suspensiones.
- ⏳ **Manejo inteligente de Rate Limit y bloqueos suaves**: Pausa y reintenta automáticamente con pausas exponenciales ante respuestas HTTP 429 o HTTP 400 (`feedback_required`) evitando que el escaneo falle.
- ⚠️ **Protección contra falsos no-seguidores**: Límites de páginas ampliados para cuentas con decenas de miles de seguidores, y bloqueo de seguridad del unfollow si el escaneo se interrumpió.
- 🤍 **Lista blanca persistente y masiva**: Protege a tus amigos y familiares con guardado local, exportación/importación en JSON y opción de pegar nombres de usuario directamente.
- ⚙️ **Tiempos configurables**: Ajusta los intervalos entre peticiones para mayor seguridad.
- 🎨 **Diseño limpio y moderno**: Interfaz minimalista y responsiva inspirada en el diseño de Apple.
- 🔒 **Privacidad total**: Todo se ejecuta localmente en tu navegador. Tus datos y contraseñas nunca salen de tu sesión ni van a servidores externos.

### 🛠️ Desarrollo

- Versión de Node: Node 16+ / Node 18+ / Node 20+
- Instalar dependencias: `npm install`
- Compilar: `npm run build`
- Servidor de desarrollo con recarga automática: `npm run build-dev`
- No edites `public/index.html` a mano: se regenera automáticamente con GitHub Actions, y los PRs que lo modifican son rechazados.

---

## ⚖️ Legal & License

**Disclaimer:** This tool is not affiliated, associated, authorized, endorsed by, or officially connected with Instagram.  
**Aviso:** Esta herramienta no está afiliada, asociada ni respaldada oficialmente por Instagram.

⚠️ **Use at your own risk! / ¡Úsalo bajo tu propio riesgo!**

📜 Licensed under the [MIT License](LICENSE)
