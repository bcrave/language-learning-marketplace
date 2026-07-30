export const USER_ROLES = [
  "STUDENT",
  "TEACHER",
  "ORGANIZATION_MANAGER",
  "PLATFORM_ADMINISTRATOR",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const INTERFACE_LOCALES = ["en", "es"] as const;
export type InterfaceLocale = (typeof INTERFACE_LOCALES)[number];

export function namedRegionalTimeZones(): string[] {
  return Intl.supportedValuesOf("timeZone").filter((timeZone) =>
    timeZone.includes("/"),
  );
}

export interface UserIdentity {
  issuer: string;
  subject: string;
}

export interface Authenticator {
  authenticate(request: Request): Promise<UserIdentity | null>;
}

export const interfaceMessages = {
  en: {
    "workspace.eyebrow": "Student workspace",
    "workspace.greeting": "Hello, {name}",
    "workspace.introduction": "Your language-learning journey starts here.",
    "workspace.timeZone": "Time zone: {timeZone}",
    "workspace.nextStep": "Upcoming Class Sessions will appear here.",
    "workspace.settings": "Settings",
    "workspace.navigation": "Workspace navigation",
    "workspace.loading": "Opening your workspace…",
    "workspace.error": "We couldn't open your workspace. Try again.",
    "preferences.title": "Choose your preferences",
    "preferences.savedTitle": "Your preferences",
    "preferences.suggestion": "These choices are suggested from this browser. They are not saved until you consent.",
    "preferences.locale": "Interface language",
    "preferences.locale.en": "English",
    "preferences.locale.es": "Spanish",
    "preferences.timeZone": "Display time zone",
    "preferences.timeZoneHelp": "Class Session times and calendar dates use this regional time zone.",
    "preferences.save": "Save preferences",
    "preferences.saving": "Saving preferences…",
    "preferences.saved": "Preferences saved.",
    "preferences.error": "We couldn't save your preferences. Try again.",
    "workspace.timeZonePreview": "Time zone preview",
    "workspace.currentInstant": "Local time when this page opened: {instant}",
    "workspace.localDate": "Calendar date",
    "workspace.localDateHelp": "This date starts at {instant} in universal time when interpreted in your Display Time Zone.",
    "workspace.localDateInvalid": "That calendar date has no unambiguous start in this Display Time Zone.",
    "auth.loading": "Checking your session…",
    "auth.error": "We couldn't verify your session. Try again.",
    "auth.signIn": "Sign in",
  },
  es: {
    "workspace.eyebrow": "Espacio de estudiante",
    "workspace.greeting": "Hola, {name}",
    "workspace.introduction": "Tu recorrido de aprendizaje comienza aquí.",
    "workspace.timeZone": "Zona horaria: {timeZone}",
    "workspace.nextStep": "Tus próximas sesiones de clase aparecerán aquí.",
    "workspace.settings": "Configuración",
    "workspace.navigation": "Navegación del espacio",
    "workspace.loading": "Abriendo tu espacio…",
    "workspace.error": "No pudimos abrir tu espacio. Inténtalo de nuevo.",
    "preferences.title": "Elige tus preferencias",
    "preferences.savedTitle": "Tus preferencias",
    "preferences.suggestion": "Estas opciones son sugerencias de este navegador. No se guardan hasta que des tu consentimiento.",
    "preferences.locale": "Idioma de la interfaz",
    "preferences.locale.en": "Inglés",
    "preferences.locale.es": "Español",
    "preferences.timeZone": "Zona horaria de visualización",
    "preferences.timeZoneHelp": "Las horas de las sesiones de clase y las fechas del calendario usan esta zona horaria regional.",
    "preferences.save": "Guardar preferencias",
    "preferences.saving": "Guardando preferencias…",
    "preferences.saved": "Preferencias guardadas.",
    "preferences.error": "No pudimos guardar tus preferencias. Inténtalo de nuevo.",
    "workspace.timeZonePreview": "Vista previa de la zona horaria",
    "workspace.currentInstant": "Hora local cuando se abrió esta página: {instant}",
    "workspace.localDate": "Fecha del calendario",
    "workspace.localDateHelp": "Esta fecha comienza a las {instant} en tiempo universal cuando se interpreta en tu zona horaria de visualización.",
    "workspace.localDateInvalid": "Esa fecha del calendario no tiene un comienzo inequívoco en esta zona horaria de visualización.",
    "auth.loading": "Comprobando tu sesión…",
    "auth.error": "No pudimos verificar tu sesión. Inténtalo de nuevo.",
    "auth.signIn": "Iniciar sesión",
  },
} as const;
