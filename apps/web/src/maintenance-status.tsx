import { interfaceMessages, type InterfaceLocale } from "@marketplace/core";
import { FormattedMessage, IntlProvider } from "react-intl";

import { suggestedInterfaceLocale } from "./interface-locale.js";

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function maintenanceAwareFetch(
  fetcher: Fetcher,
  onMaintenance: () => void,
): Fetcher {
  return async (input, init) => {
    const response = await fetcher(input, init);
    if (response.status !== 503) return response;
    try {
      const body = await response.clone().json() as { status?: string };
      if (body.status === "maintenance") onMaintenance();
    } catch {
      // Other 503 responses remain ordinary transport failures. Only the narrow,
      // reviewer-safe maintenance envelope changes the application state.
    }
    return response;
  };
}

export function MaintenanceStatus({
  locale = suggestedInterfaceLocale(),
  onRefresh = () => window.location.reload(),
}: {
  locale?: InterfaceLocale;
  onRefresh?: () => void;
}) {
  return (
    <IntlProvider locale={locale} messages={interfaceMessages[locale]}>
      <main className="authentication-status">
        <h1><FormattedMessage id="maintenance.heading" /></h1>
        <p role="status"><FormattedMessage id="maintenance.explanation" /></p>
        <button type="button" onClick={onRefresh}>
          <FormattedMessage id="maintenance.refresh" />
        </button>
      </main>
    </IntlProvider>
  );
}
