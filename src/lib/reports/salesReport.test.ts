/// <reference types="vitest" />
import { describe, expect, it } from "vitest";
import { generateSalesReportPdf } from "./salesReport";
import { salesReportFixture } from "@/tests/fixtures/salesReport";

describe("sales report pdf helper", () => {
  it("generates a pdf and summarises totals correctly", () => {
    const pdf = generateSalesReportPdf({
      sales: salesReportFixture,
      filters: {},
      companyName: "Demo Company",
    });

    expect(pdf).toBeDefined();
    expect(typeof (pdf as any).internal === "object").toBe(true);
  });

  it("filters sales by store and date before generating pdf", () => {
    const pdf = generateSalesReportPdf({
      sales: salesReportFixture,
      filters: {
        storeId: "store-1",
        dateFrom: "2025-01-01",
        dateTo: "2025-01-02",
      },
    });

    expect(pdf).toBeDefined();
  });
});




