import { describe, it, expect } from "vitest";
import { formatVenezuelaDateAndTime, formatVenezuelaDateTime, VENEZUELA_TIMEZONE } from "./venezuelaTime";

describe("venezuelaTime", () => {
  it("usa zona America/Caracas", () => {
    expect(VENEZUELA_TIMEZONE).toBe("America/Caracas");
  });

  // 2024-06-15T18:30:00.000Z → 14:30 en Caracas (UTC−4, sin horario de verano)
  it("convierte un instante UTC a hora de pared en Venezuela", () => {
    const iso = "2024-06-15T18:30:00.000Z";
    const { timeStr } = formatVenezuelaDateAndTime(iso);
    expect(timeStr).toMatch(/14\s*:\s*30/);
  });

  it("formatVenezuelaDateTime incluye fecha y hora Venezuela", () => {
    const iso = "2024-06-15T18:30:00.000Z";
    const full = formatVenezuelaDateTime(iso);
    expect(full.length).toBeGreaterThan(8);
    expect(full).toMatch(/14\s*:\s*30/);
  });

  it("devuelve cadena vacía si la fecha es inválida", () => {
    expect(formatVenezuelaDateTime("")).toBe("");
    expect(formatVenezuelaDateAndTime("invalid").dateStr).toBe("");
  });
});
