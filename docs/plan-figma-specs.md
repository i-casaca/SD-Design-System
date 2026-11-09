# Plan · Orden en Figma + Specs desde el contrato

Rama: `exp/figma-specs-organizacion` · Destino Figma: **SDD Library** (`zljuuqX4X2LAFNuWB4SQj7`) · Estado: borrador

Idea: el agente del DS (skill `ui-contract-builder`, modo C) es el nodo de control. Cada vez que dibuja un componente, lo coloca en su sitio y genera su Spec. Nada se dibuja «flotando».

## Regla de oro

`contrato.json` → (Figma: section + component set) → (Figma: Spec) → `node check.mjs`.
La Spec **se genera** desde el contrato. Nunca se escribe a mano (`docs/contract-guide.md` §7).

## Fase 0 · Comprobaciones (solo lectura)

- [ ] `figma_list_open_files`: confirmar SDD Library activo, con OK del usuario.
- [ ] `whoami` (MCP oficial de Figma): ¿el plan del archivo tiene `specs_enabled: true`? Si no, la Spec nativa no existe y se usa el plan B (fase 2).
- [ ] Mirar en Radix Themes (solo lectura) cómo son sus sections y headers para copiar el patrón, no el estilo.

## Fase 1 · Estructura de páginas y sections

Una página por componente, con un formato propio de SDD Library (distinto de Radix):

```
Página «Button»
└─ Section «Button»
   ├─ Header (instancia de un componente _Header: nombre, versión, estado, ruta del contrato)
   ├─ Section «Variants»   → el COMPONENT_SET
   ├─ Section «Examples»   → instancias, una por variante relevante
   └─ Spec (SPEC_BLOCK)    → la documentación
```

- [ ] Crear el componente `_Header` (local, con prefijo `_` para no publicarlo como DS). Campos de texto: `name`, `version`, `status`, `contract`.
- [ ] Páginas fijas al principio: `Cover`, `Foundations` (tokens), `Icons`, separador `----`, y luego una por componente.
- [ ] Añadir a `references/contract-to-figma.md` la regla: «crea o reutiliza la Section del componente y su Header antes de crear el set».

## Fase 2 · Spec «estilo Zeroheight» generada desde el contrato

Plantilla única (`docs/spec-template.md`) que el agente rellena desde el JSON:

1. `# <name>` + línea de versión y estado
2. `## Descripción` ← `description`
3. `## Cuándo usarlo / no usarlo` ← `guidance`
4. `## Props` (tabla) ← `props[]`
5. `## Variantes y estados` ← `states`, con enlace a cada ejemplo de la Section «Examples»
6. `## Anatomía` ← `anatomy`
7. `## Tokens` (tabla) ← `tokens.bindings`
8. `## Accesibilidad` ← `a11y`
9. `## Código` → bloque ```tsx (uso del componente) y bloque ```json (el contrato, o su parte relevante)
10. `## Fuente` → permalink de GitHub al contrato (nunca ruta local)

- [ ] Script `scripts/build-spec.mjs <Componente>` que produce el Markdown. Así la Spec es reproducible y no depende del agente.
- [ ] Bloque ```json «de consulta»: solo `props` (nombre, tipo, valores, default) y `tokens.bindings`. El contrato entero queda en el permalink de `## Fuente`.
- [ ] El agente crea la Spec con `figma.spec.createOnCanvasAsync` la primera vez y la actualiza con `editContent` después.

### Ejecución automática desde la skill

El script se lanza desde `ui-contract-builder`, como último paso del **modo C (Contrato → Figma)** y del **modo D** cuando se aplica un cambio. No hace falta hook: la skill ya es el punto por el que pasa todo dibujado.

- [ ] Mover el script a `skills/ui-contract-builder/scripts/build-spec.mjs` (junto a `check.mjs`) para que viaje con la skill a otros proyectos.
- [ ] En `references/contract-to-figma.md`, añadir al final del flujo:
  1. `node <skill>/scripts/check.mjs <raíz>` (0 errores, si no, se para).
  2. `node <skill>/scripts/build-spec.mjs <raíz> <Componente>` → Markdown.
  3. Buscar el `SPEC_BLOCK` de la Section del componente (`anchors.figma.spec`); si no existe, crearlo; si existe, `editContent` por secciones.
  4. Releer con `getContent` y comprobar que la versión del contrato aparece en la Spec.
- [ ] En `SKILL.md`, «Al terminar»: una línea que remita a ese paso.
- Descartado por ahora: un hook de Claude Code tras `use_figma`. Se dispararía en cada escritura, no solo al terminar un componente. Se plantea si la skill se queda corta.
- Opcional, más adelante: el bloque ```tsx como Code Layer en la Section «Examples» (está activo en el archivo).
- [ ] **Doble dirección (versión mínima):** la Spec enlaza al contrato en GitHub y el contrato guarda el nodo de la Spec en `anchors.figma.spec`. Si el esquema no admite ese campo, va a `meta` (no tocar el esquema sin preguntar).
- [ ] Plan B si no hay Specs: el mismo Markdown en un frame de texto dentro de la Section, marcado como «generado».

## Fase 3 · Tokens e iconos como recursos

Ya existe en `tokens/tokens.json`: primitivos (`colors`, `spacing`, `radius`…) y una capa semántica (`tokens.colors`, `tokens.space`) que apunta a ellos. No hace falta inventar el modelo.

- [ ] Volcar a SDD Library dos colecciones: `Primitives` y `Semantic` (alias a primitivos, modos Light/Dark). Los componentes solo usan `Semantic`.
- [ ] Iconos: **Phosphor** (decidido). Traer la librería de comunidad a la página `Icons` y enlazarla. Reglas en `contracts/PhosphorIconLibrary.contract.json`.
- [ ] `Icon.contract.json` está escrito solo para Lucide: adaptarlo a Phosphor (subida de `version` major si cambia la API). No bloquea a Divider, que no lleva iconos.
- [ ] Publicar SDD Library como librería del equipo (paso manual del usuario en Figma).

## Fase 4 · Prueba con un componente

- [ ] **Divider** (decidido). Hoy es un ejemplo didáctico sin `anchors.figma`: se dibuja por primera vez en SDD Library, se rellenan `anchors.figma.file/node` y se quita su aviso de `needsReview`. Contrato → Section → Spec → `check.mjs`.
- [ ] Si sale bien, Button. Nada de Checkbox (216 variantes) en esta fase.

## Fase 5 · Entrega

- [ ] Commits en esta rama (contrato primero, luego script y docs).
- [ ] Push al fork `i-casaca/SD-Design-System` → solo con OK.
- [ ] PR hacia `mokkapp-studio/SD-Design-System` → solo con OK y como paso aparte.

## Modelo de página y Spec (2026-11-09, ticket «Plantilla de la Spec»)

Sustituye al esquema de Fase 1 y a la lista de Fase 2 (que quedan como histórico).

**Página de componente en SDD Library** (una Section por componente, ancho = columna + Spec):

```
Section «<Componente>»
├─ _sdd-header      oscuro (#1C2024), ancho completo de la Section: eyebrow, título, descripción, versión, enlace al contrato
├─ column-bg        fondo gris, a la izquierda, de la altura de la Section
├─ component        el COMPONENT_SET (blanco sobre el gris)
├─ examples         ejemplos (blanco sobre el gris)
└─ Documentation    SPEC_BLOCK a la derecha de la columna (x = ancho columna + 60, y = bajo el header)
```

- Al terminar de generar la Spec se **restituye el alto de la Section** = max(Spec, columna) + 80 y se ensancha el header al ancho de la Section. El botón «full size» de la Spec no tiene API: se hace a mano en la UI.
- Los **building blocks** de la documentación (`_anatomy`, `_specs`, solo los dibujos que se exportan a imagen) viven aparte, en la página «Helpers», en una Section «Building blocks · <Componente>». Nada de láminas sueltas dentro de la Section del componente.

**Spec «Documentation»** (un solo documento; cabeceras en inglés, contenido en el idioma del contrato; bloque sin dato = se omite):

```
# Documentation
## Overview            Definition · Usage Guidelines (+ Label) · Behavior and Interactions
## Anatomy             Component Breakdown · Specs · Properties (+ #### Code) · Tokens · Breakpoints · Motion
## Accessibility       incluye el contraste medido de la variante dibujada
## History             git log
```

- **Solo son imagen los dibujos**: anatomía con marcadores (fondo oscuro, magenta) y cotas de Specs (azul, bandas verdes de padding y naranjas de espacio). **Todo dato es Markdown** (tablas GFM): partes con valor, token y cadena de alias; Layout and spacing; tokens por size; All properties; Tokens con `var(--…)`. Así lo lee una máquina.
- Los datos salen **extraídos del componente en Figma** (variables enlazadas, alias resueltos, estilos de texto), no de los números del contrato. Los valores sin token se marcan «sin token».
- `#### Code` dentro de Properties: contrato condensado (props + `base` + `bySize`; Divider entero) y `tsx` de uso, más enlace al contrato completo.
- Referencia de estilo: Dynamic Handoff (datos) y Hovercard (dibujo de cotas). Dynamic Handoff se usa solo para contrastar; no se deja su salida en el archivo.

## Decisiones (2026-11-08)

1. Iconos: **Phosphor**.
2. Specs y Code Layer **activos** en el plan del archivo → Spec nativa; el plan B queda solo como respaldo.
3. Primer componente: **Divider**.
4. Bloque ```json: **versión de consulta** (props + tokens).
5. `build-spec.mjs` se ejecuta **desde la skill** al terminar el dibujado (modo C/D), sin hook.
6. Página de componente: header oscuro a todo el ancho, columna gris con componente y ejemplos, Spec a la derecha; alto de Section restituido al terminar; building blocks aparte en «Helpers».
7. Spec: dibujos como imagen, todos los datos como Markdown; añade «Tokens» al esqueleto de #20.
