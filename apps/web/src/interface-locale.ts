import type { InterfaceLocale } from "@marketplace/core";

export function suggestedInterfaceLocale(): InterfaceLocale {
  return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}
