export const USER_ROLES = [
  "STUDENT",
  "TEACHER",
  "ORGANIZATION_MANAGER",
  "PLATFORM_ADMINISTRATOR",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const INTERFACE_LOCALES = ["en", "es"] as const;
export type InterfaceLocale = (typeof INTERFACE_LOCALES)[number];

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
    "auth.loading": "Comprobando tu sesión…",
    "auth.error": "No pudimos verificar tu sesión. Inténtalo de nuevo.",
    "auth.signIn": "Iniciar sesión",
  },
} as const;
