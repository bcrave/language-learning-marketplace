import {
  namedRegionalTimeZones,
  type InterfaceLocale,
} from "@marketplace/core";

export function suggestedInterfaceLocale(): InterfaceLocale {
  return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

export function suggestedDisplayTimeZone(): string {
  const suggestion = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return namedRegionalTimeZones().includes(suggestion)
    ? suggestion
    : "America/Denver";
}
