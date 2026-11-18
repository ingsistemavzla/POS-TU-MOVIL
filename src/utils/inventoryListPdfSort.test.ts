import { describe, it, expect } from "vitest";
import { classifyAccessoryType } from "./accessoryInventorySort";
import { sortInventoryListForPdf } from "./inventoryListPdfSort";
import { classifyPhoneBrand } from "./phoneInventorySort";
import { classifyTechnicalServiceName } from "./technicalServiceInventorySort";

type Row = {
  name: string;
  category: string | null;
  total_stock: number;
  sale_price_usd: number;
};

function row(name: string, category: string | null, stock = 1, price = 10): Row {
  return { name, category, total_stock: stock, sale_price_usd: price };
}

describe("sortInventoryListForPdf", () => {
  it("Todas: bloques phones → accessories → technical_service → no reconocidas", () => {
    const input = [
      row("Pantalla Samsung A16", "technical_service", 1, 40),
      row("cable aroax", "accessories", 2, 8),
      row("samsung a16", "phones", 3, 150),
      row("Batería Samsung", "technical_service", 4, 12),
      row("Audífonos BT", "accessories", 5, 20),
      row("iPhone 13", "phones", 6, 300),
      row("Producto raro", "misc_legacy", 7, 1),
      row("Sin cat", null, 8, 2),
    ];
    const snapshot = input.map((r) => ({ ...r }));
    const sorted = sortInventoryListForPdf("all", input);

    expect(input).toEqual(snapshot);
    expect(sorted).toHaveLength(input.length);

    const cats = sorted.map((r) => r.category);
    // phones first
    expect(cats.slice(0, 2).every((c) => c === "phones")).toBe(true);
    // then accessories
    expect(cats.slice(2, 4).every((c) => c === "accessories")).toBe(true);
    // then ST
    expect(cats.slice(4, 6).every((c) => c === "technical_service")).toBe(true);
    // then unrecognized
    expect(new Set(cats.slice(6))).toEqual(new Set(["misc_legacy", null]));

    // Dentro de phones: apple antes que samsung
    const phones = sorted.filter((r) => r.category === "phones");
    expect(phones.map((p) => classifyPhoneBrand(p.name).brandKey)).toEqual(["apple", "samsung"]);

    // Dentro de ST: pantalla antes que batería
    const st = sorted.filter((r) => r.category === "technical_service");
    expect(st.map((p) => classifyTechnicalServiceName(p.name).family)).toEqual([
      "pantalla",
      "bateria",
    ]);

    // Accesorios: audifonos antes que cables (alfa de tipo)
    const acc = sorted.filter((r) => r.category === "accessories");
    expect(acc.map((p) => classifyAccessoryType(p.name).type)).toEqual([
      "audifonos",
      "cables",
    ]);

    for (const item of input) {
      const found = sorted.find(
        (s) => s.name === item.name && s.category === item.category && s.total_stock === item.total_stock
      );
      expect(found?.sale_price_usd).toBe(item.sale_price_usd);
    }
  });

  it("phones / accessories delegan a sus sorters", () => {
    const phones = [
      row("xiaomi note", "phones"),
      row("samsung a05", "phones"),
    ];
    expect(
      sortInventoryListForPdf("phones", phones).map((p) => classifyPhoneBrand(p.name).brandKey)
    ).toEqual(["samsung", "xiaomi"]);

    const acc = [
      row("cable x", "accessories"),
      row("Audífono y", "accessories"),
    ];
    expect(
      sortInventoryListForPdf("accessories", acc).map((p) => classifyAccessoryType(p.name).type)
    ).toEqual(["audifonos", "cables"]);
  });
});
