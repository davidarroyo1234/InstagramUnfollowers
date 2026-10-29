export type Language = "en" | "es" | "tr";

export const LANGUAGE_STORAGE_KEY = "iu_language";

export const translations = {
  en: {
    // Launch Screen
    localAccountAudit: "Local account audit",
    launchTitle: "Find the follows that do not follow back.",
    launchDescription: "Scan your Instagram follows, review risk signals, protect whitelisted accounts, and act only on the users you select.",
    runScan: "Run Scan",
    runsInBrowserOnly: "Runs in this browser session only",
    loadCachedScan: "Load previous scan (%s accounts)",
    ready: "Ready",
    protected: "Protected",
    whitelist: "Whitelist",
    review: "Review",
    selectFirst: "Select first",

    // Toolbar
    scanNoticeBanner: "⚡ Fetching accounts in real time...",
    copyList: "Copy List",
    exportJson: "Export JSON",
    exportCsv: "Export CSV",
    unfollowSelected: "Unfollow Selected",
    selectPage: "Select Page",
    selectAll: "Select All",
    settings: "Settings",
    goBackConfirm: "Go back to Instagram?",
    copiedToClipboard: "List copied to clipboard!",
    unfollowDisabledPartialScan: "Unfollow disabled: the scan did not finish completely.",
    switchToSpanish: "Cambiar a Español",
    switchToEnglish: "Switch to English",
    switchToTurkish: "Türkçe'ye geç",

    // Scanner / Filters
    scanner: "Scanner",
    filters: "Filter",
    nonFollowers: "Non-Followers",
    followers: "Followers",
    verified: "Verified",
    private: "Private",
    withoutProfilePicture: "Without Profile Picture",
    searchPlaceholder: "Search users...",
    nonWhitelistedTab: "Non-Whitelisted",
    whitelistedTab: "Whitelisted",
    addToWhitelist: "Add to Whitelist",
    removeFromWhitelist: "Remove from Whitelist",
    noUsersFound: "No users found matching your filters.",
    filterClearConfirm: "Changing filter options will clear selected users",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
    pause: "Pause",
    resume: "Resume",
    partialScanWarning: "⚠️ Incomplete scan: it was interrupted before every account was checked, so some non-followers may be missing. Mass unfollow is disabled to protect your account.",
    noPic: "No Pic",
    clear: "Clear",
    displayed: "Displayed",
    totalScanned: "Total scanned",
    scanSummary: "Scan Summary",
    unfollowCount: "Unfollow (%s)",
    unfollowConfirm: "Are you sure you want to unfollow the selected accounts?",
    scanInProgressWait: "Scan in progress: please wait until scan finishes to unfollow.",
    selectAtLeastOneUser: "Must select at least a single user to unfollow",

    // Settings
    settingsTitle: "Settings",
    language: "Language",
    timeBetweenSearchCycles: "Default time between search cycles",
    timeToWaitAfterFiveCycles: "Default time to wait after five search cycles",
    timeBetweenUnfollows: "Default time between unfollows",
    timeToWaitAfterFiveUnfollows: "Default time to wait after five unfollows",
    usersPerSearchCycle: "Users fetched per request (count)",
    settingsWarning1: "WARNING: Modifying these settings can lead to your account being banned.",
    settingsWarning2: "USE IT AT YOUR OWN RISK!!!!",
    saveSettings: "Save Settings",
    cancel: "Cancel",
    save: "Save",
    warningPrefix: "WARNING:",

    // Whitelist Manager
    whitelistTitle: "Whitelist Management",
    whitelistDescription: "Manage users you want to protect from being unfollowed.",
    exportWhitelist: "Export Whitelist",
    importWhitelist: "Import Whitelist",
    clearWhitelist: "Clear Whitelist",
    clearWhitelistConfirm: "Are you sure you want to clear your whitelist?",
    whitelistExported: "Whitelist exported successfully!",
    whitelistImported: "Whitelist imported successfully!",
    whitelistCleared: "Whitelist cleared!",
    userSingular: "user",
    userPlural: "users",
    mergeWhitelist: "Merge (add to existing)",
    replaceWhitelist: "Replace (overwrite)",
    whitelistTip: "Export your whitelist to save it as a backup. You can import it later to restore your saved users.",
    pasteWhitelist: "Paste Usernames",
    pasteWhitelistPlaceholder: "Paste usernames here (separated by commas, spaces, or newlines)...",
    addPastedToWhitelist: "Add to Whitelist",
    pastedUsersAdded: "Added %s new users to whitelist!",
    noValidUsernamesFound: "No valid usernames found.",
    pastedUsersAlreadyExist: "All pasted users are already in the whitelist.",
    noUsers: "No users",
    tip: "Tip:",
    invalidWhitelistFile: "Invalid file format: Expected an array of users",
    invalidWhitelistUsers: "Invalid file format: Users missing required fields (id, username)",
    failedToParseWhitelist: "Failed to parse JSON file: %s",
    failedToReadFile: "Failed to read file",
    unknownError: "Unknown error",
    mergedWhitelist: "Merged successfully! Added %s new users (%s imported, %s duplicates skipped)",
    replacedWhitelist: "Replaced whitelist with %s users",

    // Unfollowing Queue
    unfollowQueue: "Unfollow Queue",
    succeeded: "Succeeded",
    failed: "Failed",
    allDone: "All DONE!",
    unfollowed: "Unfollowed",
    failedToUnfollow: "Failed to unfollow",

    // Toasts & Notifications
    scanCompleted: "Scanning completed!",
    scanFailedFollowing: "Scan failed: could not load your following list from Instagram.",
    scanFailedFollowers: "Scan failed: could not load your followers list from Instagram.",
    indexingFollowersProgress: "Indexing followers (%s loaded)...",
    scanningFollowingProgress: "Checking followed accounts (%s checked)...",
    partialScanInterrupted: "Partial scan: checked %s accounts, but scan was interrupted.",
    rateLimitPause: "Instagram cooldown active. Pausing for %s seconds before retrying...",
    sleepingSafety: "Sleeping %s seconds to prevent getting temp blocked",
    loadedFromCache: "Loaded %s accounts from cache!",
    actionBlockedWarning: "⚠️ Instagram Action Block detected (feedback_required). Unfollow queue stopped to protect your account.",
  },
  es: {
    // Launch Screen
    localAccountAudit: "Auditoría local de cuenta",
    launchTitle: "Encuentra a quienes sigues pero no te siguen de vuelta.",
    launchDescription: "Escanea tus seguidos de Instagram, analiza señales de riesgo, protege cuentas en lista blanca y actúa solo sobre los usuarios seleccionados.",
    runScan: "Iniciar Escaneo",
    runsInBrowserOnly: "Se ejecuta solo en esta sesión del navegador",
    loadCachedScan: "Cargar escaneo anterior (%s cuentas)",
    ready: "Listo",
    protected: "Protegido",
    whitelist: "Lista blanca",
    review: "Revisar",
    selectFirst: "Selecciona primero",

    // Toolbar
    scanNoticeBanner: "⚡ Obteniendo cuentas en tiempo real...",
    copyList: "Copiar Lista",
    exportJson: "Exportar JSON",
    exportCsv: "Exportar CSV",
    unfollowSelected: "Dejar de Seguir Seleccionados",
    selectPage: "Seleccionar Página",
    selectAll: "Seleccionar Todos",
    settings: "Ajustes",
    goBackConfirm: "¿Deseas volver a Instagram?",
    copiedToClipboard: "¡Lista copiada al portapapeles!",
    unfollowDisabledPartialScan: "Unfollow desactivado: el escaneo no finalizó por completo.",
    switchToSpanish: "Cambiar a Español",
    switchToEnglish: "Switch to English",
    switchToTurkish: "Türkçe'ye geç",

    // Scanner / Filters
    scanner: "Escáner",
    filters: "Filtros",
    nonFollowers: "No te siguen",
    followers: "Te siguen",
    verified: "Verificados",
    private: "Privados",
    withoutProfilePicture: "Sin foto de perfil",
    searchPlaceholder: "Buscar usuarios...",
    nonWhitelistedTab: "Fuera de Lista Blanca",
    whitelistedTab: "En Lista Blanca",
    addToWhitelist: "Añadir a Lista Blanca",
    removeFromWhitelist: "Quitar de Lista Blanca",
    noUsersFound: "No se encontraron usuarios con estos filtros.",
    filterClearConfirm: "Cambiar los filtros borrará los usuarios seleccionados",
    page: "Página",
    of: "de",
    previous: "Anterior",
    next: "Siguiente",
    pause: "Pausar",
    resume: "Reanudar",
    partialScanWarning: "⚠️ Escaneo incompleto: se interrumpió antes de revisar todas las cuentas, por lo que pueden faltar cuentas que no te siguen. El unfollow masivo ha sido desactivado por seguridad.",
    noPic: "Sin foto",
    clear: "Limpiar",
    displayed: "Mostrados",
    totalScanned: "Total escaneados",
    scanSummary: "Resumen",
    unfollowCount: "Dejar de Seguir (%s)",
    unfollowConfirm: "¿Estás seguro de dejar de seguir a las cuentas seleccionadas?",
    scanInProgressWait: "Escaneo en progreso: espera a que termine para dejar de seguir.",
    selectAtLeastOneUser: "Debes seleccionar al menos un usuario",

    // Settings
    settingsTitle: "Configuración",
    language: "Idioma",
    timeBetweenSearchCycles: "Tiempo entre ciclos de búsqueda",
    timeToWaitAfterFiveCycles: "Tiempo de espera tras cinco ciclos de búsqueda",
    timeBetweenUnfollows: "Tiempo entre cada unfollow",
    timeToWaitAfterFiveUnfollows: "Tiempo de espera tras cinco unfollows",
    usersPerSearchCycle: "Usuarios por solicitud (cantidad)",
    settingsWarning1: "ADVERTENCIA: Modificar estos valores puede provocar bloqueos en tu cuenta.",
    settingsWarning2: "¡ÚSALO BAJO TU PROPIO RIESGO!",
    saveSettings: "Guardar Ajustes",
    cancel: "Cancelar",
    save: "Guardar",
    warningPrefix: "ADVERTENCIA:",

    // Whitelist Manager
    whitelistTitle: "Gestión de Lista Blanca",
    whitelistDescription: "Administra las cuentas que deseas proteger para no dejarlas de seguir.",
    exportWhitelist: "Exportar Lista Blanca",
    importWhitelist: "Importar Lista Blanca",
    clearWhitelist: "Borrar Lista Blanca",
    clearWhitelistConfirm: "¿Estás seguro de que deseas borrar tu lista blanca?",
    whitelistExported: "¡Lista blanca exportada correctamente!",
    whitelistImported: "¡Lista blanca importada correctamente!",
    whitelistCleared: "¡Lista blanca borrada!",
    userSingular: "usuario",
    userPlural: "usuarios",
    mergeWhitelist: "Combinar (añadir)",
    replaceWhitelist: "Reemplazar (sobrescribir)",
    whitelistTip: "Exporta tu lista blanca para guardarla como copia de seguridad. Puedes importarla después para restaurar tus usuarios guardados.",
    pasteWhitelist: "Pegar Usuarios",
    pasteWhitelistPlaceholder: "Pega nombres de usuario aquí (separados por comas, espacios o saltos de línea)...",
    addPastedToWhitelist: "Añadir a Lista Blanca",
    pastedUsersAdded: "¡Se añadieron %s nuevos usuarios a la lista blanca!",
    noValidUsernamesFound: "No se encontraron nombres de usuario válidos.",
    pastedUsersAlreadyExist: "Todos los usuarios pegados ya están en la lista blanca.",
    noUsers: "Sin usuarios",
    tip: "Consejo:",
    invalidWhitelistFile: "Formato de archivo no válido: se esperaba una lista de usuarios",
    invalidWhitelistUsers: "Formato de archivo no válido: faltan campos obligatorios (id, username)",
    failedToParseWhitelist: "No se pudo leer el archivo JSON: %s",
    failedToReadFile: "No se pudo leer el archivo",
    unknownError: "Error desconocido",
    mergedWhitelist: "¡Combinado! Se añadieron %s usuarios nuevos (%s importados, %s duplicados omitidos)",
    replacedWhitelist: "Lista blanca reemplazada por %s usuarios",

    // Unfollowing Queue
    unfollowQueue: "Cola de Unfollow",
    succeeded: "Exitosos",
    failed: "Fallidos",
    allDone: "¡TODO LISTO!",
    unfollowed: "Dejó de seguir a",
    failedToUnfollow: "Error al dejar de seguir a",

    // Toasts & Notifications
    scanCompleted: "¡Escaneo completado!",
    scanFailedFollowing: "Error en el escaneo: no se pudo cargar la lista de seguidos de Instagram.",
    scanFailedFollowers: "Error en el escaneo: no se pudo cargar la lista de seguidores de Instagram.",
    indexingFollowersProgress: "Indexando seguidores (%s cargados)...",
    scanningFollowingProgress: "Comprobando cuentas seguidas (%s revisadas)...",
    partialScanInterrupted: "Escaneo parcial: se revisaron %s cuentas, pero el escaneo fue interrumpido.",
    rateLimitPause: "Enfriamiento de Instagram activo. Pausando %s segundos antes de reintentar...",
    sleepingSafety: "Esperando %s segundos para prevenir bloqueos temporales",
    loadedFromCache: "¡Se cargaron %s cuentas del historial!",
    actionBlockedWarning: "⚠️ Bloqueo de acción de Instagram detectado (feedback_required). La cola se detuvo para proteger tu cuenta.",
  },
  tr: {
    // Launch Screen
    localAccountAudit: "Yerel hesap denetimi",
    launchTitle: "Geri takip etmeyenleri bulun.",
    launchDescription: "Instagram takip listenizi tarayın, risk işaretlerini inceleyin, korumak istediğiniz hesapları beyaz listeye alın ve yalnızca seçtiğiniz kullanıcılara işlem yapın.",
    runScan: "Taramayı Başlat",
    runsInBrowserOnly: "Yalnızca bu tarayıcı oturumunda çalışır",
    loadCachedScan: "Önceki taramayı yükle (%s hesap)",
    ready: "Hazır",
    protected: "Korumalı",
    whitelist: "Beyaz Liste",
    review: "İncele",
    selectFirst: "Önce seç",

    // Toolbar
    scanNoticeBanner: "⚡ Hesaplar gerçek zamanlı olarak alınıyor...",
    copyList: "Listeyi Kopyala",
    exportJson: "JSON Dışa Aktar",
    exportCsv: "CSV Dışa Aktar",
    unfollowSelected: "Seçilenleri Bırak",
    selectPage: "Sayfayı Seç",
    selectAll: "Tümünü Seç",
    settings: "Ayarlar",
    goBackConfirm: "Instagram'a geri dönülsün mü?",
    copiedToClipboard: "Liste panoya kopyalandı!",
    unfollowDisabledPartialScan: "Bırakma devre dışı: tarama tamamlanmadı.",
    switchToSpanish: "İspanyolca'ya geç",
    switchToEnglish: "İngilizce'ye geç",
    switchToTurkish: "Türkçe'ye geç",

    // Scanner / Filters
    scanner: "Tarayıcı",
    filters: "Filtre",
    nonFollowers: "Geri Takip Etmeyenler",
    followers: "Takipçiler",
    verified: "Onaylı",
    private: "Gizli",
    withoutProfilePicture: "Profil Fotoğrafsız",
    searchPlaceholder: "Kullanıcı ara...",
    nonWhitelistedTab: "Beyaz Liste Dışı",
    whitelistedTab: "Beyaz Listede",
    addToWhitelist: "Beyaz Listeye Ekle",
    removeFromWhitelist: "Beyaz Listeden Çıkar",
    noUsersFound: "Filtrelerinize uyan kullanıcı bulunamadı.",
    filterClearConfirm: "Filtreleri değiştirmek seçili kullanıcıları temizler",
    page: "Sayfa",
    of: "/",
    previous: "Önceki",
    next: "Sonraki",
    pause: "Duraklat",
    resume: "Devam Et",
    partialScanWarning: "⚠️ Eksik tarama: tüm hesaplar kontrol edilmeden kesildi, bu yüzden bazı geri takip etmeyenler eksik olabilir. Hesabınızı korumak için toplu bırakma devre dışı.",
    noPic: "Fotoğraf Yok",
    clear: "Temizle",
    displayed: "Gösterilen",
    totalScanned: "Taranan toplam",
    scanSummary: "Tarama Özeti",
    unfollowCount: "Bırak (%s)",
    unfollowConfirm: "Seçilen hesapları takipten çıkarmak istediğinize emin misiniz?",
    scanInProgressWait: "Tarama sürüyor: takipten çıkmak için taramanın bitmesini bekleyin.",
    selectAtLeastOneUser: "Takipten çıkarmak için en az bir kullanıcı seçmelisiniz",

    // Settings
    settingsTitle: "Ayarlar",
    language: "Dil",
    timeBetweenSearchCycles: "Arama döngüleri arası varsayılan süre",
    timeToWaitAfterFiveCycles: "Beş arama döngüsünden sonra varsayılan bekleme süresi",
    timeBetweenUnfollows: "Takipten çıkarmalar arası varsayılan süre",
    timeToWaitAfterFiveUnfollows: "Beş takipten çıkarmadan sonra varsayılan bekleme süresi",
    usersPerSearchCycle: "İstek başına alınan kullanıcı (adet)",
    settingsWarning1: "UYARI: Bu ayarları değiştirmek hesabınızın yasaklanmasına yol açabilir.",
    settingsWarning2: "RİSK TAMAMEN SİZE AİTTİR!!!!",
    saveSettings: "Ayarları Kaydet",
    cancel: "İptal",
    save: "Kaydet",
    warningPrefix: "UYARI:",

    // Whitelist Manager
    whitelistTitle: "Beyaz Liste Yönetimi",
    whitelistDescription: "Takipten çıkarılmaktan korumak istediğiniz kullanıcıları yönetin.",
    exportWhitelist: "Beyaz Listeyi Dışa Aktar",
    importWhitelist: "Beyaz Listeyi İçe Aktar",
    clearWhitelist: "Beyaz Listeyi Temizle",
    clearWhitelistConfirm: "Beyaz listenizi temizlemek istediğinize emin misiniz?",
    whitelistExported: "Beyaz liste başarıyla dışa aktarıldı!",
    whitelistImported: "Beyaz liste başarıyla içe aktarıldı!",
    whitelistCleared: "Beyaz liste temizlendi!",
    userSingular: "kullanıcı",
    userPlural: "kullanıcı",
    mergeWhitelist: "Birleştir (mevcuda ekle)",
    replaceWhitelist: "Değiştir (üzerine yaz)",
    whitelistTip: "Beyaz listenizi yedek olarak dışa aktarın. Daha sonra içe aktararak kayıtlı kullanıcılarınızı geri yükleyebilirsiniz.",
    pasteWhitelist: "Kullanıcı Adı Yapıştır",
    pasteWhitelistPlaceholder: "Kullanıcı adlarını buraya yapıştırın (virgül, boşluk veya satırla ayrılmış)...",
    addPastedToWhitelist: "Beyaz Listeye Ekle",
    pastedUsersAdded: "Beyaz listeye %s yeni kullanıcı eklendi!",
    noValidUsernamesFound: "Geçerli kullanıcı adı bulunamadı.",
    pastedUsersAlreadyExist: "Yapıştırılan kullanıcıların tümü zaten beyaz listede.",
    noUsers: "Kullanıcı yok",
    tip: "İpucu:",
    invalidWhitelistFile: "Geçersiz dosya biçimi: kullanıcı listesi bekleniyordu",
    invalidWhitelistUsers: "Geçersiz dosya biçimi: zorunlu alanlar eksik (id, username)",
    failedToParseWhitelist: "JSON dosyası okunamadı: %s",
    failedToReadFile: "Dosya okunamadı",
    unknownError: "Bilinmeyen hata",
    mergedWhitelist: "Birleştirildi! %s yeni kullanıcı eklendi (%s içe aktarıldı, %s yinelenen atlandı)",
    replacedWhitelist: "Beyaz liste %s kullanıcıyla değiştirildi",

    // Unfollowing Queue
    unfollowQueue: "Takipten Çıkarma Kuyruğu",
    succeeded: "Başarılı",
    failed: "Başarısız",
    allDone: "TAMAMI TAMAM!",
    unfollowed: "Takipten çıkarıldı",
    failedToUnfollow: "Takipten çıkarılamadı",

    // Toasts & Notifications
    scanCompleted: "Tarama tamamlandı!",
    scanFailedFollowing: "Tarama başarısız: Instagram'dan takip listeniz yüklenemedi.",
    scanFailedFollowers: "Tarama başarısız: Instagram'dan takipçi listeniz yüklenemedi.",
    indexingFollowersProgress: "Takipçiler dizinleniyor (%s yüklendi)...",
    scanningFollowingProgress: "Takip edilen hesaplar kontrol ediliyor (%s kontrol edildi)...",
    partialScanInterrupted: "Kısmi tarama: %s hesap kontrol edildi ancak tarama kesildi.",
    rateLimitPause: "Instagram bekleme süresi aktif. Yeniden denemeden önce %s saniye duraklatılıyor...",
    sleepingSafety: "Geçici engel yememek için %s saniye bekleniyor",
    loadedFromCache: "Önbellekten %s hesap yüklendi!",
    actionBlockedWarning: "⚠️ Instagram eylem engeli algılandı (feedback_required). Hesabınızı korumak için kuyruk durduruldu.",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "en" || saved === "es" || saved === "tr") {
      return saved;
    }
    if (typeof navigator !== "undefined" && navigator.language) {
      const browserLanguage = navigator.language.toLowerCase();
      if (browserLanguage.startsWith("tr")) {
        return "tr";
      }
      if (browserLanguage.startsWith("es")) {
        return "es";
      }
    }
  } catch {
    // fallback
  }
  return "en";
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function t(lang: Language, key: TranslationKey, ...args: (string | number)[]): string {
  const dict = translations[lang] || translations.en;
  let text: string = dict[key] || translations.en[key] || (key as string);
  for (const arg of args) {
    text = text.replace("%s", String(arg));
  }
  return text;
}
