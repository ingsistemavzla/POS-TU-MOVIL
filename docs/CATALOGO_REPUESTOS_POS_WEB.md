# Instrucciones para Cursor Web: cómo leer los datos del POS

**No cambiamos la base de datos ni la RPC.** El POS ya envía los datos así; Cursor Web debe adaptar el frontend para leerlos correctamente.

---

## 1. Contrato actual: qué envía la RPC `get_public_web_products_catalog`

El campo **`category`** viene con el **valor interno** que usa el POS (no con el nombre “bonito”):

| Valor que envía el POS (`category`) | En el POS lo llamamos | Pestaña en la web donde debe mostrarse |
|-------------------------------------|------------------------|----------------------------------------|
| `phones`                            | Teléfonos              | **Celulares**                          |
| `accessories`                       | Accesorios             | **Accesorios**                         |
| `technical_service`                 | Servicio Técnico      | **Repuestos**                          |

La pestaña “Repuestos” en la web es la misma categoría que en el POS se llama “Servicio Técnico”. El valor que llega en la API es **`technical_service`**, no "Servicio Técnico" ni "Repuestos".

---

## 2. Qué debe hacer Cursor Web

Para que los productos aparezcan en la pestaña correcta (y en particular en **Repuestos**), el frontend debe tratar `category` así:

- **Celulares:** productos con `category === 'phones'`
- **Accesorios:** productos con `category === 'accessories'`
- **Repuestos:** productos con `category === 'technical_service'`

Es decir, hay que **incluir el valor `'technical_service'`** en la lógica que decide “este producto va en la pestaña Repuestos”. Si hoy solo se comprueba "Repuestos" o "Servicio Técnico" (texto), no se reconocerá lo que envía el POS y la pestaña Repuestos quedará vacía.

Resumen: **adaptar el filtro/mapeo de categorías en el frontend** para que acepte:

- `'phones'` → Celulares  
- `'accessories'` → Accesorios  
- `'technical_service'` → Repuestos  

---

## 3. Condiciones para que un producto aparezca (ya cumplidas por la RPC)

La RPC solo devuelve productos que:

- están activos,
- tienen imagen en `web_image_url` (no null ni vacío),
- están marcados como visibles en web (`web_visible === true`).

Si en el POS un producto de Servicio Técnico tiene imagen y está visible en web, llegará en la respuesta con `category: 'technical_service'`. Solo falta que el frontend lo asocie a la pestaña Repuestos como en el punto 2.

---

## 4. Resumen para Cursor Web

| Pestaña en la web | Valor de `category` que debe aceptar el frontend |
|-------------------|---------------------------------------------------|
| Celulares         | `'phones'`                                        |
| Accesorios        | `'accessories'`                                  |
| Repuestos         | `'technical_service'`                            |

**Acción:** En el código del catálogo, asegurarse de que la pestaña Repuestos filtre o agrupe también por `category === 'technical_service'` (además de los textos que ya tengan, si aplica). Nosotros no vamos a cambiar la RPC ni la base de datos; la web se adapta a estos valores.
