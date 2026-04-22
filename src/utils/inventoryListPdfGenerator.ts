import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getCategoryLabel } from "@/constants/categories";
import { VENEZUELA_TIMEZONE } from "@/utils/venezuelaTime";

export interface InventoryListItem {
  name: string;
  category: string | null;
  total_stock: number;
  sale_price_usd: number;
}

function addLogo(doc: jsPDF, y: number, maxWidth: number = 22): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoPath = "/logo_factura.png";

  try {
    const logoAspectRatio = 500 / 257;
    const finalWidth = maxWidth;
    const finalHeight = maxWidth / logoAspectRatio;
    const logoX = (pageWidth - finalWidth) / 2;
    doc.addImage(logoPath, "PNG", logoX, y, finalWidth, finalHeight);
    return y + finalHeight + 6;
  } catch {
    return y + 4;
  }
}

export async function downloadInventoryListPDF(params: {
  items: InventoryListItem[];
  category: string;
}): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let currentY = margin;

  currentY = addLogo(doc, currentY, 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 120, 120);
  doc.text("Lista de Inventario", pageWidth / 2, currentY, { align: "center" });
  currentY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const categoryLabel = params.category === "all" ? "Todas las categorías" : getCategoryLabel(params.category);
  doc.text(categoryLabel, pageWidth / 2, currentY, { align: "center" });
  currentY += 6;

  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("es-VE", {
    timeZone: VENEZUELA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const timeStr = new Intl.DateTimeFormat("es-VE", {
    timeZone: VENEZUELA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  doc.text(`Fecha: ${dateStr}  |  Hora: ${timeStr}`, pageWidth / 2, currentY, { align: "center" });
  currentY += 6;

  doc.setDrawColor(0, 120, 120);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  const rows = params.items.map((p) => [
    p.name,
    (p.total_stock ?? 0).toString(),
    `$${Number(p.sale_price_usd ?? 0).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Producto", "Stock Total", "Precio (USD)"]],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: [0, 120, 120],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      valign: "top",
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: {
      cellPadding: 1.6,
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
      overflow: "linebreak", // ✅ No truncar: el nombre puede ser largo
    },
    columnStyles: {
      0: { cellWidth: 112, halign: "left" },  // Producto (ancha)
      1: { cellWidth: 24, halign: "center" }, // Stock Total
      2: { cellWidth: 32, halign: "right" },  // Precio
    },
    margin: { left: margin, right: margin },
  });

  const fileNameSafeCategory = (params.category === "all" ? "todas" : categoryLabel)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
  const fileName = `lista-inventario-${fileNameSafeCategory}-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}

