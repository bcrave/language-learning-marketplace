import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MaintenanceStatus,
  maintenanceAwareFetch,
} from "../src/maintenance-status.js";

afterEach(cleanup);

describe("reviewer maintenance behavior", () => {
  it("recognizes only the reviewer-safe maintenance response", async () => {
    const onMaintenance = vi.fn();
    const fetcher = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ status: "maintenance" }),
      { status: 503, headers: { "content-type": "application/json", "retry-after": "60" } },
    ));

    const response = await maintenanceAwareFetch(fetcher, onMaintenance)("/graphql");

    expect(response.status).toBe(503);
    expect(onMaintenance).toHaveBeenCalledOnce();
  });

  it("presents an accessible localized refresh action", async () => {
    const { container } = render(<MaintenanceStatus locale="es" onRefresh={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Mantenimiento en curso" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Vuelve a intentarlo");
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeVisible();
    expect((await axe.run(container)).violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});
