# Reporte: Catálogo Repuestos visible en la web

**Fecha:** Febrero 2025  
**Estado:** Resuelto. Los repuestos (Servicio Técnico) se muestran correctamente en la pestaña Repuestos del catálogo web.

---

## Qué se hizo

- **Posición del POS:** No se modificó la base de datos ni la RPC. El POS sigue enviando `category` con los valores internos: `phones`, `accessories`, `technical_service`.
- **Contrato documentado:** Se creó `docs/CATALOGO_REPUESTOS_POS_WEB.md` con el contrato actual de la RPC y las instrucciones para Cursor Web.
- **Adaptación en la web:** Cursor Web adaptó el frontend para que la pestaña **Repuestos** acepte y muestre productos con `category === 'technical_service'` (equivalente a “Servicio Técnico” en el POS).

---

## Contrato de categorías (RPC → web)

| Valor en API (`category`) | Pestaña en la web |
|---------------------------|-------------------|
| `phones`                  | Celulares         |
| `accessories`             | Accesorios        |
| `technical_service`       | Repuestos         |

---

## Referencia

- Instrucciones para la web: `docs/CATALOGO_REPUESTOS_POS_WEB.md`
- RPC: `get_public_web_products_catalog()` (sin cambios en este cierre).
