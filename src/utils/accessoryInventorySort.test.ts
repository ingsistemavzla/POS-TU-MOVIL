import { describe, it, expect } from "vitest";
import { classifyAccessoryType, sortAccessoryInventoryItems } from "./accessoryInventorySort";

type Row = { name: string; total_stock: number; sale_price_usd: number; category: string | null };

function row(name: string, stock = 1, price = 10): Row {
  return { name, total_stock: stock, sale_price_usd: price, category: "accessories" };
}

describe("classifyAccessoryType", () => {
  it("reconoce tipos y variantes habituales", () => {
    expect(classifyAccessoryType("Audífonos Bluetooth").type).toBe("audifonos");
    expect(classifyAccessoryType("Cargador Samsung 25W").type).toBe("cargadores");
    expect(classifyAccessoryType("cable aroax 644").type).toBe("cables");
    expect(classifyAccessoryType("Funda iPhone 14").type).toBe("fundas");
    expect(classifyAccessoryType("Micas iPhone 11").type).toBe("micas");
    expect(classifyAccessoryType("Power Bank 10000").type).toBe("baterias_externas");
    expect(classifyAccessoryType("Batería externa Wake").type).toBe("baterias_externas");
    expect(classifyAccessoryType("MINI UPS 12000 MAH").type).toBe("baterias_externas");
  });

  it("detecta tipo tras marca conocida (ugreen cable)", () => {
    expect(classifyAccessoryType("ugreen cable 844").type).toBe("cables");
  });

  it("envía ambiguos a otros", () => {
    expect(classifyAccessoryType("Soporte auto magnético").type).toBe("otros");
    expect(classifyAccessoryType("XYZ genérico").type).toBe("otros");
  });
});

describe("sortAccessoryInventoryItems", () => {
  it("agrupa tipos, deja otros al final y conserva datos", () => {
    const input = [
      row("Soporte auto", 1, 5),
      row("cable aroax 644", 2, 8),
      row("Audífonos Xiaomi", 3, 20),
      row("ugreen cable 844", 4, 12),
      row("Cargador 20W", 5, 15),
      row("Funda Samsung A16", 6, 7),
      row("Mica Samsung A16", 7, 3),
      row("Powerbank Baseus", 8, 25),
    ];
    const snapshot = input.map((r) => ({ ...r }));
    const sorted = sortAccessoryInventoryItems(input);

    expect(input).toEqual(snapshot);
    expect(sorted).toHaveLength(8);

    const types = sorted.map((r) => classifyAccessoryType(r.name).type);
    expect(types[types.length - 1]).toBe("otros");
    expect(types.filter((t) => t === "cables")).toHaveLength(2);

    // cables consecutivos
    const cableIndexes = sorted
      .map((r, i) => (classifyAccessoryType(r.name).type === "cables" ? i : -1))
      .filter((i) => i >= 0);
    expect(cableIndexes[1] - cableIndexes[0]).toBe(1);

    for (const item of input) {
      const found = sorted.find((s) => s.name === item.name);
      expect(found?.total_stock).toBe(item.total_stock);
      expect(found?.sale_price_usd).toBe(item.sale_price_usd);
    }
  });
});
