import { describe, it, expect } from "vitest";
import {
  classifyTechnicalServiceName,
  normalizeProductNameForSort,
  sortTechnicalServiceInventoryItems,
  type TechnicalServiceFamily,
} from "./technicalServiceInventorySort";

type Row = { name: string; total_stock: number; sale_price_usd: number; category: string | null };

function row(name: string, stock = 1, price = 10): Row {
  return { name, total_stock: stock, sale_price_usd: price, category: "technical_service" };
}

describe("normalizeProductNameForSort", () => {
  it("normaliza mayúsculas, acentos y espacios", () => {
    expect(normalizeProductNameForSort("  Pántalla   SAMSUNG  ")).toBe("pantalla samsung");
  });
});

describe("classifyTechnicalServiceName", () => {
  it("clasifica variantes de pantalla", () => {
    expect(classifyTechnicalServiceName("Pantalla Samsung A16").family).toBe("pantalla");
    expect(classifyTechnicalServiceName("pantallas xiaomi").family).toBe("pantalla");
    expect(classifyTechnicalServiceName("Display Samsung A15").family).toBe("pantalla");
    expect(classifyTechnicalServiceName("LCD Samsung A14").family).toBe("pantalla");
  });

  it("clasifica baterías y flex", () => {
    expect(classifyTechnicalServiceName("Batería Samsung A16").family).toBe("bateria");
    expect(classifyTechnicalServiceName("battery xiaomi").family).toBe("bateria");
    expect(classifyTechnicalServiceName("Flex Samsung A16").family).toBe("flex");
  });

  it("Flex de pantalla → flex (tipo principal inicial)", () => {
    expect(classifyTechnicalServiceName("Flex de pantalla Samsung A16").family).toBe("flex");
  });

  it("reconoce pines/conector de carga con contexto", () => {
    expect(classifyTechnicalServiceName("Pin de carga Samsung A16").family).toBe("pin_carga");
    expect(classifyTechnicalServiceName("Pines de carga Xiaomi").family).toBe("pin_carga");
    expect(classifyTechnicalServiceName("Conector de carga Samsung").family).toBe("pin_carga");
    expect(classifyTechnicalServiceName("Pin carga A16").family).toBe("pin_carga");
  });

  it("no clasifica pin/conector aislados sin carga", () => {
    expect(classifyTechnicalServiceName("Pin Samsung A16").family).toBe("otros");
    expect(classifyTechnicalServiceName("Conector USB Samsung").family).toBe("otros");
    expect(classifyTechnicalServiceName("Conector Samsung").family).toBe("otros");
  });

  it("clasifica micas", () => {
    expect(classifyTechnicalServiceName("Mica Samsung A16").family).toBe("mica");
    expect(classifyTechnicalServiceName("Micas Xiaomi").family).toBe("mica");
  });

  it("tolera typo menor único en término largo (Pantllas)", () => {
    expect(classifyTechnicalServiceName("Pantllas Samsung A14").family).toBe("pantalla");
  });

  it("envía ambiguos y no reconocidos a otros", () => {
    expect(classifyTechnicalServiceName("Tornillo universal").family).toBe("otros");
    expect(classifyTechnicalServiceName("").family).toBe("otros");
    expect(classifyTechnicalServiceName("XYZ repuesto").family).toBe("otros");
  });
});

describe("sortTechnicalServiceInventoryItems", () => {
  it("ordena familias en secuencia obligatoria y agrupa marcas", () => {
    const input = [
      row("Flex Samsung A16", 2, 12),
      row("batería samsung A15", 3, 8),
      row("Pantllas Samsung A14", 1, 40),
      row("Pantalla Xiaomi Note", 4, 35),
      row("Pin de carga Samsung A16", 5, 6),
      row("Mica Samsung A16", 6, 3),
      row("Tornillo universal", 7, 1),
      row("Pantalla Samsung A16", 8, 42),
      row("Conector USB generico", 9, 2),
    ];

    const originalSnapshot = input.map((r) => ({ ...r }));
    const sorted = sortTechnicalServiceInventoryItems(input);

    // No muta el array original ni los campos
    expect(input).toEqual(originalSnapshot);
    expect(sorted).toHaveLength(input.length);

    const families = sorted.map((r) => classifyTechnicalServiceName(r.name).family);
    const expectedOrder: TechnicalServiceFamily[] = [
      "pantalla",
      "pantalla",
      "pantalla",
      "bateria",
      "flex",
      "pin_carga",
      "mica",
      "otros",
      "otros",
    ];
    expect(families).toEqual(expectedOrder);

    // Pantallas: bloque Samsung antes que Xiaomi (denominación)
    const pantallas = sorted.filter(
      (r) => classifyTechnicalServiceName(r.name).family === "pantalla"
    );
    expect(pantallas.map((p) => p.name)).toEqual([
      "Pantllas Samsung A14",
      "Pantalla Samsung A16",
      "Pantalla Xiaomi Note",
    ]);

    // Conservación íntegra stock/precio por nombre
    for (const item of input) {
      const found = sorted.find((s) => s.name === item.name);
      expect(found?.total_stock).toBe(item.total_stock);
      expect(found?.sale_price_usd).toBe(item.sale_price_usd);
      expect(found?.category).toBe(item.category);
    }
  });

  it("es determinista: mismo input → mismo orden", () => {
    const input = [
      row("Pantalla B"),
      row("Pantalla A"),
      row("Batería Z"),
      row("Flex Y"),
    ];
    const a = sortTechnicalServiceInventoryItems(input).map((r) => r.name);
    const b = sortTechnicalServiceInventoryItems(input).map((r) => r.name);
    expect(a).toEqual(b);
  });

  it("no pierde filas con nombres duplicados (estabilidad por índice)", () => {
    const input = [row("Pantalla X", 1), row("Pantalla X", 2), row("Pantalla X", 3)];
    const sorted = sortTechnicalServiceInventoryItems(input);
    expect(sorted.map((r) => r.total_stock)).toEqual([1, 2, 3]);
  });
});
