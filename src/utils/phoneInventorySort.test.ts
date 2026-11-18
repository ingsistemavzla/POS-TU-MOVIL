import { describe, it, expect } from "vitest";
import { classifyPhoneBrand, sortPhoneInventoryItems } from "./phoneInventorySort";

type Row = { name: string; total_stock: number; sale_price_usd: number; category: string | null };

function row(name: string, stock = 1, price = 10): Row {
  return { name, total_stock: stock, sale_price_usd: price, category: "phones" };
}

describe("classifyPhoneBrand", () => {
  it("agrupa alias iPhone/Apple, Galaxy/Samsung, POCO/Xiaomi", () => {
    expect(classifyPhoneBrand("iPhone 13").brandKey).toBe("apple");
    expect(classifyPhoneBrand("Apple iPhone 14").brandKey).toBe("apple");
    expect(classifyPhoneBrand("Galaxy A16 128GB").brandKey).toBe("samsung");
    expect(classifyPhoneBrand("samsung galaxy a05").brandKey).toBe("samsung");
    expect(classifyPhoneBrand("POCO X8 Pro").brandKey).toBe("xiaomi");
    expect(classifyPhoneBrand("xiaomi note 15").brandKey).toBe("xiaomi");
  });

  it("tolera typo documentado INIFNIX y fuzzy ≤1 en marca larga", () => {
    expect(classifyPhoneBrand("INIFNIX NOTE 50 PRO").brandKey).toBe("infinix");
    expect(classifyPhoneBrand("Infiniix Note 60").brandKey).toBe("infinix");
  });

  it("usa primer token si la marca no se reconoce", () => {
    expect(classifyPhoneBrand("Acme Phone X").brandKey).toBe("acme");
    expect(classifyPhoneBrand("Acme Phone Y").brandKey).toBe("acme");
  });
});

describe("sortPhoneInventoryItems", () => {
  it("agrupa marcas y ordena modelos; no muta ni pierde datos", () => {
    const input = [
      row("xiaomi note 15 128gb", 2, 120),
      row("samsung galaxy a16 128gb", 3, 150),
      row("iPhone 13", 1, 300),
      row("Galaxy A05 64gb", 4, 100),
      row("POCO X8 Pro", 5, 200),
      row("samsung galaxy a05 64gb", 6, 110),
    ];
    const snapshot = input.map((r) => ({ ...r }));
    const sorted = sortPhoneInventoryItems(input);

    expect(input).toEqual(snapshot);
    expect(sorted).toHaveLength(input.length);

    const brands = sorted.map((r) => classifyPhoneBrand(r.name).brandKey);
    // apple, samsung×3, xiaomi×2 (orden alfabético de brandKey)
    expect(brands).toEqual([
      "apple",
      "samsung",
      "samsung",
      "samsung",
      "xiaomi",
      "xiaomi",
    ]);

    const samsung = sorted.filter((r) => classifyPhoneBrand(r.name).brandKey === "samsung");
    expect(samsung.map((s) => s.name)).toEqual([
      "Galaxy A05 64gb",
      "samsung galaxy a05 64gb",
      "samsung galaxy a16 128gb",
    ]);

    for (const item of input) {
      const found = sorted.find((s) => s.name === item.name);
      expect(found?.total_stock).toBe(item.total_stock);
      expect(found?.sale_price_usd).toBe(item.sale_price_usd);
    }
  });
});
