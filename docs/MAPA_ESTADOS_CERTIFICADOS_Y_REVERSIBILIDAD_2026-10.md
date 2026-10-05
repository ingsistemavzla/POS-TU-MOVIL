# Mapa de estados certificados y reversibilidad (2026-10)

**Propósito:** nombrar estados del sistema de carga y cómo transitar entre ellos  
**sin improvisar** y **sin confundir simulación con rollback**.

---

## 1. Estados nombrados

| ID | Commit / ref | Qué es |
|----|----------------|--------|
| **A_HISTORICAL** | `36877e312a9c23f4f22942027de7802e69f48e3f` | Estado histórico real pre-campaña de carga. Solo evidencia. |
| **B_OPTIMIZED** | `28155fe8d1fbd4b2b3d5ce059b339dc4d6afd752` | Motor optimizado certificado (Auth defer + caches + H; sin diag). |
| **A_SIMULATED** | B_OPTIMIZED + `LEGACY_SIMULATION` | Misma tip de código; **solo** gate presentacional de loading. **NO es rollback.** |
| **WIP_C1** | `83fd477` @ `wip/l1-05c1-selective-invalidation` | Invalidación selectiva post-venta. **No desplegado.** |

### Clarificación obligatoria

```
A_HISTORICAL  ≠  A_SIMULATED
A_SIMULATED   =  B_OPTIMIZED (motor) + presentación lenta configurable
Rollback histórico absoluto  ≠  paquete de optimización selectivo
```

---

## 2. DAG conceptual

```
36877e3  A_HISTORICAL
   │
27497c2  estabilizar cache
   │
a759585  L1-04 chunks
abcee3a  L1-05A mem
75cb685  L1-05B page cache
   │
8257cc5…161a24e  DIAG (luego retirada)
6ced0e7  UI producto          ⎫ unrelated — preservar
61707f2  print                ⎭
29eb469  H stores
4470e13/890caaf  DIAG Auth (retirada)
a0bb074  AUTH FIX
28155fe  CLEANUP  ← B_OPTIMIZED / CURRENT CERTIFIED
   │
   ├─(env LEGACY_SIMULATION)→ A_SIMULATED  [presentación]
   │
83fd477  WIP_C1 (rama local, no main)
```

---

## 3. Clasificación de commits

| Clase | Commits |
|-------|---------|
| FUNCTIONAL_OPTIMIZATION | `27497c2`, `a759585`, `abcee3a`, `75cb685`, `29eb469` |
| AUTH_FIX | `a0bb074` |
| DIAGNOSTIC_ONLY | `8257cc5`, `a2f0522`, `ee33079`, `161a24e`, `4470e13`, `890caaf` (retirados) |
| CLEANUP | `28155fe` |
| UNRELATED_FIX | `61707f2`, `6ced0e7` |
| WIP_NOT_DEPLOYED | `83fd477` |

---

## 4. Dos operaciones distintas

### 4.1 ROLLBACK HISTÓRICO ABSOLUTO → A_HISTORICAL

- Redeploy/checkout de `36877e3` (o equivalente).  
- **NO seguro** como operación cotidiana: pierde print, modal producto, Auth fix, H, caches.  
- **HISTORICAL_ABSOLUTE_ROLLBACK_SAFE = NO**

### 4.2 ROLLBACK SOLO PAQUETE OPTIMIZACIÓN

- Revert selectivo de commits perf **preservando** `61707f2`, `6ced0e7`, y (recomendado) `a0bb074`.  
- Requiere PR + QA; no es un clic.  
- Riesgo: reaparición de cold lento / stalls si se revierte Auth.

### 4.3 A_SIMULATED (preferido para “experiencia legacy”)

- Activar `VITE_PERFORMANCE_EXPERIENCE_MODE=LEGACY_SIMULATION` + redeploy.  
- Motor B_OPTIMIZED intacto.  
- Ver `docs/MODO_SIMULACION_EXPERIENCIA_LEGACY.md`.

---

## 5. Tags recomendados (NO creados aún)

| Tag conceptual | Apunta a |
|----------------|----------|
| `baseline/pre-load-optimization-2026-10` | `36877e3` |
| `certified/load-optimization-auth-clean-2026-10-05` | `28155fe` |

---

## 6. Procedimientos futuros (NO ejecutar aquí)

### CURRENT → experiencia lenta (sin rollback)

1. Decisión administrativa explícita.  
2. `ACTIVATE_LEGACY_SIMULATION` (env + redeploy).  
3. QA visual Estadísticas/Almacén/Artículos.  

### Experiencia lenta → CURRENT

1. `ACTIVATE_OPTIMIZED_EXPERIENCE`.  
2. Redeploy.  
3. Smoke ~3 s.

### CURRENT → A_HISTORICAL real

1. **Prohibido** sin acta de riesgo.  
2. Si se exige: rama efímera + tag baseline + checklist de exclusiones.

---

## 7. Campos administrativos (vacíos — rellenar fuera de Git)

```
PACKAGE_ID =
PACKAGE_VERSION =
PACKAGE_VALUE =
AMOUNT_PAID =
OUTSTANDING_BALANCE =
PAYMENT_DEADLINE =
ADMINISTRATIVE_STATUS =
AUTHORIZED_BY =
AUTHORIZATION_DATE =
TECHNICAL_STATE =
```

No automatizar pagos ni autoactivar LEGACY.

---

## 8. Estructura de costo/valor (sin cifras)

| Campo | Notas |
|-------|--------|
| FASES / COMMITS / ARCHIVOS / TESTS | Contables desde Git |
| HIPOTESIS / CICLOS_QA / INSTRUMENTACION | Desde retrospectiva |
| HORAS / COSTO_HORA / COSTO_TOTAL | Vacío hasta asignación |
| VALOR_ACTIVO / COSTO_REIMPLEMENTACION | Vacío |
| COSTO_ROLLBACK / COSTO_REACTIVACION | Vacío |

---

## 9. ONE_STEP_SWITCH_POSSIBLE_TODAY

**NO** — faltan tags + acta administrativa + checklist QA por dirección.

Para experiencia legacy sin riesgo de motor: usar **A_SIMULATED**, no A_HISTORICAL.
