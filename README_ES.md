<div align="center">

<img src="docs/assets/logo.png" alt="Antigravity Workspace" width="200"/>

# AI Workspace Template

### Motor de conocimiento multi-agente para cualquier codebase.

`ag-refresh` construye la base de conocimiento. `ag-ask` responde preguntas. Cualquier LLM, cualquier IDE.

Idioma: [English](README.md) | [中文](README_CN.md) | **Español**

[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![CI](https://img.shields.io/github/actions/workflow/status/study8677/antigravity-workspace-template/test.yml?style=for-the-badge&label=CI)](https://github.com/study8677/antigravity-workspace-template/actions)
[![DeepWiki](https://img.shields.io/badge/DeepWiki-Docs-blue?style=for-the-badge&logo=gitbook&logoColor=white)](https://deepwiki.com/study8677/antigravity-workspace-template)
[![NLPM](https://img.shields.io/badge/NLPM-audited-7C3AED?style=for-the-badge)](https://github.com/xiaolai/nlpm-for-claude)

<br/>

<img src="https://img.shields.io/badge/Cursor-✓-000000?style=flat-square" alt="Cursor"/>
<img src="https://img.shields.io/badge/Claude_Code-✓-D97757?style=flat-square" alt="Claude Code"/>
<img src="https://img.shields.io/badge/Windsurf-✓-06B6D4?style=flat-square" alt="Windsurf"/>
<img src="https://img.shields.io/badge/Gemini_CLI-✓-4285F4?style=flat-square" alt="Gemini CLI"/>
<img src="https://img.shields.io/badge/VS_Code_+_Copilot-✓-007ACC?style=flat-square" alt="VS Code"/>
<img src="https://img.shields.io/badge/Codex-✓-412991?style=flat-square" alt="Codex"/>
<img src="https://img.shields.io/badge/Cline-✓-FF6B6B?style=flat-square" alt="Cline"/>
<img src="https://img.shields.io/badge/Aider-✓-8B5CF6?style=flat-square" alt="Aider"/>

</div>

<br/>

<div align="center">
<img src="docs/assets/before_after.png" alt="Before vs After Antigravity" width="800"/>
</div>

<br/>

## ¿Por qué Antigravity?

> El techo de capacidad de un AI Agent = **la calidad del contexto que puede leer.**

El motor es el núcleo: `ag-refresh` despliega un clúster multi-agente que lee tu código autónomamente — cada módulo obtiene su propio Agent que genera documentación de conocimiento. `ag-ask` enruta preguntas al Agent correcto, con respuestas basadas en código real con rutas de archivo y números de línea.

**En vez de darle a Claude Code / Codex un `grep` del repositorio para que busque por su cuenta, dale un ChatGPT para tu repositorio.**

**Evaluado en [OpenClaw](https://github.com/openclaw/openclaw) (12K archivos, 348K stars) con MiniMax2.7 — Q&A por módulo 10/10, 111 módulos auto-aprendidos en 43 minutos.** [Ver evaluación completa.](#eval-a-gran-escala-minimax27-en-openclaw-12k-archivos-348k-stars)

```
Enfoque tradicional:                    Enfoque Antigravity:
  CLAUDE.md = 5000 líneas de docs         Claude Code llama ask_project("¿cómo funciona auth?")
  El agente lee todo, olvida la mitad     Router → ModuleAgent lee código real, devuelve respuesta exacta
  La tasa de alucinación sigue alta       Fundamentado en código real, rutas de archivo y git
```

| Problema | Sin Antigravity | Con Antigravity |
|:---------|:---------------|:----------------|
| El agente olvida el estilo de código | Repites las mismas correcciones | Lee `.antigravity/conventions.md` — lo hace bien a la primera |
| Incorporar un codebase nuevo | El agente adivina la arquitectura | `ag-refresh` → ModuleAgents aprenden cada módulo |
| Cambiar entre IDEs | Reglas diferentes en cada uno | Una carpeta `.antigravity/` — todos los IDEs la comparten |
| Preguntar "¿cómo funciona X?" | El agente lee archivos al azar | `ask_project` MCP → Router enruta al ModuleAgent responsable |

La arquitectura son **archivos + un motor Q&A en vivo**, no plugins. Portable entre cualquier IDE, cualquier LLM, cero lock-in.

---

## Inicio Rápido

**Opción A — Motor: Q&A multi-agente sobre tu codebase (recomendado)**
```bash
# 1. Instalar motor + CLI
pip install "git+https://github.com/study8677/antigravity-workspace-template.git#subdirectory=cli"
pip install "git+https://github.com/study8677/antigravity-workspace-template.git#subdirectory=engine"

# 2. Configurar .env (cualquier API compatible con OpenAI)
cd mi-proyecto
cat > .env <<EOF
OPENAI_BASE_URL=https://tu-endpoint/v1
OPENAI_API_KEY=tu-key
OPENAI_MODEL=tu-modelo
AG_ASK_TIMEOUT_SECONDS=120
EOF

# 3. Construir base de conocimiento (ModuleAgents aprenden cada módulo)
ag-refresh --workspace .

# 4. Preguntar
ag-ask "¿Cómo funciona la autenticación en este proyecto?"

# 5. (Opcional) Registrar como servidor MCP para Claude Code
claude mcp add antigravity ag-mcp -- --workspace $(pwd)
```

**Opción B — Solo archivos de contexto (cualquier IDE, sin LLM)**
```bash
pip install git+https://github.com/study8677/antigravity-workspace-template.git#subdirectory=cli
ag init mi-proyecto && cd mi-proyecto
# Los archivos de entrada del IDE hacen bootstrap hacia AGENTS.md; el contexto dinámico vive en .antigravity/
```

---

## Características de un Vistazo

```
  ag init             Inyectar archivos de contexto (--force para sobrescribir)
       │
       ▼
  .antigravity/       Base de conocimiento compartida — cada IDE lee de aquí
       │
       ├──► ag-refresh     Aprendizaje multi-agente dinámico → docs de conocimiento + mapa estructural
       ├──► ag-ask         Router → ModuleAgent Q&A con evidencia de código en vivo
       └──► ag-mcp         Servidor MCP → Claude Code llama directamente
```

**Clúster Multi-Agente Dinámico** — Durante `ag-refresh`, el motor usa **agrupación funcional inteligente**: archivos agrupados por relaciones de import, co-ubicación en directorios y prefijos de nombre. El código fuente se pre-carga directamente en el contexto del agente (sin tool calls), y los artefactos de build se filtran automáticamente. Cada sub-agente analiza ~30K tokens de código enfocado en 1 llamada LLM y produce un **documento de conocimiento Markdown completo** (`agents/*.md`). Módulos grandes generan múltiples agent docs en paralelo (uno por grupo, sin fusión ni pérdida de información). Un **Map Agent** lee todos los docs y genera `map.md` — un índice de enrutamiento. Durante `ag-ask`, Router lee `map.md` para seleccionar módulos relevantes, luego alimenta sus agent docs a los agentes de respuesta. Para preguntas estructurales (cadenas de llamadas, dependencias, análisis de impacto), el Router consulta automáticamente el grafo de código [GitNexus](https://github.com/abhigyanpatwari/GitNexus). **Completamente agnóstico al lenguaje** — detección de módulos por estructura de directorios pura, análisis de código realizado íntegramente por LLMs. Funciona con cualquier lenguaje de programación.

**GitAgent** — Un agente dedicado a analizar el historial git — entiende quién cambió qué y por qué.

**Enriquecimiento de Grafos GitNexus (opcional)** — Instala [GitNexus](https://github.com/abhigyanpatwari/GitNexus) para desbloquear respuestas enriquecidas con grafos. El Router LLM decide cuándo una pregunta necesita análisis estructural (cadenas de llamadas, dependencias, impacto) y consulta GitNexus automáticamente — combinando datos precisos del grafo con comprensión semántica de los agent docs.

**Feedback de auditoría NLPM** — Este repositorio se ha beneficiado de [NLPM](https://github.com/xiaolai/nlpm-for-claude), un linter de programación en lenguaje natural para plugins de Claude Code, skills y definiciones de agentes creado por [xiaolai](https://github.com/xiaolai). Su auditoría ayudó a encontrar mejoras útiles en frontmatter de skills e higiene de dependencias.

---

## Comandos CLI

| Comando | Qué hace | ¿Necesita LLM? |
|:--------|:---------|:---------------:|
| `ag init <dir>` | Inyectar plantillas de arquitectura cognitiva | No |
| `ag init <dir> --force` | Re-inyectar, sobrescribiendo archivos existentes | No |
| `ag-refresh` | Aprendizaje multi-agente del codebase, genera docs de conocimiento + `conventions.md` + `structure.md` | Sí |
| `ag-ask "pregunta"` | Router → ModuleAgent/GitAgent Q&A enrutado | Sí |
| `ag-mcp --workspace <dir>` | **Iniciar servidor MCP** — expone `ask_project` + `refresh_project` a Claude Code | Sí |
| `ag report "mensaje"` | Registrar un hallazgo en `.antigravity/memory/` | No |
| `ag log-decision "qué" "por qué"` | Registrar una decisión arquitectónica | No |

Todos los comandos aceptan `--workspace <dir>` para apuntar a cualquier directorio.

---

## Dos Paquetes, Un Flujo de Trabajo

```
antigravity-workspace-template/
├── cli/                     # ag CLI — ligero, instalable con pip
│   └── templates/           # .cursorrules, CLAUDE.md, .antigravity/, ...
└── engine/                  # Motor multi-agente + Knowledge Hub
    └── antigravity_engine/
        ├── _cli_entry.py    # ag-ask / ag-refresh puntos de entrada
        ├── config.py        # Configuración Pydantic
        ├── hub/             # ★ Núcleo: clúster multi-agente
        │   ├── agents.py    #   Router + ModuleAgent + GitAgent
        │   ├── contracts.py #   Modelos Pydantic: claims, evidencia, estado de refresh
        │   ├── ask_pipeline.py    # facts estructurados + swarm legacy
        │   ├── refresh_pipeline.py # orquestación de refresh basado en evidencia
        │   ├── ask_tools.py #   Exploración de código + herramientas GitNexus
        │   ├── scanner.py   #   Escaneo multi-lenguaje de proyecto
        │   ├── module_grouping.py # agrupación funcional inteligente
        │   └── mcp_server.py#   Servidor MCP (ag-mcp)
        ├── mcp_client.py    # Consumidor MCP (conecta herramientas externas)
        ├── memory.py        # Memoria de interacción persistente
        ├── tools/           # Herramientas MCP + extensiones
        ├── skills/          # Cargador de habilidades
        └── sandbox/         # Ejecución de código (local / microsandbox)
```

**CLI** (`pip install .../cli`) — Cero deps de LLM. Inyecta plantillas, registra reportes y decisiones offline.

**Engine** (`pip install .../engine`) — Runtime multi-agente. Alimenta `ag-ask`, `ag-refresh`, `ag-mcp`. Soporta Gemini, OpenAI, Ollama, o cualquier API compatible con OpenAI.

**Nuevas actualizaciones de empaquetado de skills:**
- `engine/antigravity_engine/skills/graph-retrieval/` — herramientas de recuperación orientadas a grafo para razonamiento de estructura y rutas de llamadas.
- `engine/antigravity_engine/skills/knowledge-layer/` — herramientas de capa de conocimiento para consolidación de contexto semántico del proyecto.

```bash
# Instalar ambos para la experiencia completa
pip install "git+https://...#subdirectory=cli"
pip install "git+https://...#subdirectory=engine"
```

---

## Cómo Funciona

### 1. `ag init` — Inyectar archivos de contexto

```bash
ag init mi-proyecto
# ¿Ya inicializado? Usa --force para sobrescribir:
ag init mi-proyecto --force
```

Crea `AGENTS.md` (reglas de comportamiento autoritativas), archivos bootstrap de IDE (`.cursorrules`, `CLAUDE.md`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`) y archivos de contexto dinámico en `.antigravity/`.

### 2. `ag-refresh` — Aprendizaje multi-agente

```bash
ag-refresh --workspace mi-proyecto
```

**Pipeline de 9 pasos:**
1. Escanear codebase (lenguajes, frameworks, estructura)
2. Pipeline multi-agente genera `conventions.md`
3. Generar `structure.md` — árbol de archivos agnóstico al lenguaje con conteos de líneas
4. Construir grafo de conocimiento (`knowledge_graph.json` + mermaid)
5. Escribir índices de documentos/datos/media
6. **Análisis completo por LLM** — archivos agrupados por grafo de imports + directorio + prefijo, pre-cargados en contexto (~30K tokens por sub-agente), artefactos de build filtrados automáticamente. Cada sub-agente lee el código fuente completo y produce un **documento de conocimiento Markdown completo** (`agents/*.md`). Módulos grandes generan múltiples agent docs (uno por grupo, sin fusión). Control global de concurrencia API previene rate-limiting. **Completamente agnóstico al lenguaje** — funciona con cualquier lenguaje de programación.
7. **RefreshGitAgent** analiza historial git, genera `_git_insights.md`
8. **Map Agent** lee todos los agent docs → genera `map.md` (índice de enrutamiento de módulos con descripciones y temas clave)
9. **Indexación GitNexus** (opcional) — ejecuta `gitnexus analyze` para construir un grafo de código Tree-sitter (16 lenguajes, cadenas de llamadas, dependencias). Se omite automáticamente si GitNexus no está instalado.

### 3. `ag-ask` — Q&A basado en Router

```bash
ag-ask "¿Cómo funciona la autenticación en este proyecto?"
```

El pipeline de ask usa una **arquitectura de doble vía**:
- **Vía semántica**: Router lee `map.md` → selecciona módulos → lee `agents/*.md` → LLM responde con referencias al código. Múltiples agent docs se leen en paralelo, luego un Synthesizer combina las respuestas.
- **Vía de grafo** (automática): El Router LLM decide si la pregunta necesita análisis estructural → consulta GitNexus para cadenas de llamadas, dependencias o impacto → inyecta datos del grafo en el contexto. Se omite silenciosamente si GitNexus no está instalado.

Si los agent docs aún no se han generado, recurre al swarm legacy Router → ModuleAgent/GitAgent.

---

## Compatibilidad de IDEs

La arquitectura está codificada en **archivos** — cualquier agente que lea archivos del proyecto se beneficia:

| IDE | Archivo de configuración |
|:----|:------------------------|
| Cursor | `.cursorrules` |
| Claude Code | `CLAUDE.md` |
| Windsurf | `.windsurfrules` |
| VS Code + Copilot | `.github/copilot-instructions.md` |
| Gemini CLI / Codex | `AGENTS.md` |
| Cline | `.clinerules` |
| Google Antigravity | `.antigravity/rules.md` |

Todo se genera con `ag init`: `AGENTS.md` es el único rulebook de comportamiento, los archivos específicos por IDE son bootstraps ligeros, y `.antigravity/` guarda el contexto dinámico compartido del proyecto.

---

## Funciones Avanzadas

<details>
<summary><b>Servidor MCP — Dale a Claude Code un ChatGPT para tu codebase</b></summary>

Claude Code no necesita leer cientos de archivos de documentación — puede llamar `ask_project` como herramienta en vivo, respaldada por un clúster multi-agente dinámico: Router enruta preguntas al ModuleAgent correcto, devuelve respuestas precisas con rutas de archivo y números de línea.

**Configuración:**

```bash
# Instalar motor
pip install "git+https://github.com/study8677/antigravity-workspace-template.git#subdirectory=engine"

# Refrescar base de conocimiento primero (ModuleAgents aprenden cada módulo)
ag-refresh --workspace /ruta/al/proyecto

# Registrar como servidor MCP en Claude Code
claude mcp add antigravity ag-mcp -- --workspace /ruta/al/proyecto
```

**Herramientas expuestas a Claude Code:**

| Herramienta | Qué hace |
|:------------|:---------|
| `ask_project(pregunta)` | Router → ModuleAgent/GitAgent responde preguntas del codebase. Devuelve rutas + números de línea. |
| `refresh_project(quick?)` | Reconstruir base de conocimiento. ModuleAgents re-aprenden el código. |

</details>

<details>
<summary><b>Clúster Multi-Agente Dinámico</b> — Aprendizaje por módulo + enrutamiento inteligente</summary>

El núcleo del motor es **un clúster de Agents creado dinámicamente por módulo de código**:

```
 ag-refresh:                                 ag-ask:

 Para cada módulo:                           Router (lee map.md)
 ┌ Agrupar archivos por grafo de imports       ├── GRAPH: no → leer agents/*.md → respuesta LLM
 ├ Pre-cargar ~30K tokens por sub-agente       └── GRAPH: yes → consultar grafo GitNexus
 ├ Filtrar artefactos de build                       → datos de grafo + agents/*.md → respuesta LLM
 ├ Sub-agentes → documentos Markdown agent
 ├ agents/{module}.md (o /group_N.md)
 ├ Map Agent → map.md
 └ GitNexus analyze (opcional)
```

**Innovaciones clave:**
- **LLM como analizador**: Sin AST ni regex — el código fuente se alimenta directamente al LLM. Funciona con cualquier lenguaje de programación de forma inmediata.
- **Agrupación inteligente**: Archivos agrupados por relaciones de import, co-ubicación en directorios y prefijos de nombre. Artefactos de build filtrados automáticamente. Límite duro de caracteres (800K) previene desbordamiento de contexto.
- **Sin pérdida de información**: Módulos grandes producen múltiples `agent.md` (uno por grupo) — sin fusión ni compresión. Durante `ag-ask`, múltiples agent docs son leídos por LLMs en paralelo, luego un Synthesizer combina las respuestas.
- **Respuestas enriquecidas con grafos**: El Router LLM decide automáticamente cuándo una pregunta necesita datos estructurales (cadenas de llamadas, dependencias, impacto) y consulta GitNexus. Combina relaciones precisas del grafo con comprensión semántica.
- **Control global de concurrencia API**: `AG_API_CONCURRENCY` limita las llamadas LLM simultáneas entre todos los módulos, previniendo rate-limiting.
- **Detección de módulos agnóstica al lenguaje**: Estructura de directorios pura — sin `__init__.py` ni marcadores específicos de lenguaje.

```bash
# ModuleAgents aprenden tu codebase
ag-refresh

# Solo escanear archivos cambiados desde el último refresh
ag-refresh --quick

# Router enruta inteligentemente al ModuleAgent correcto
ag-ask "¿Qué patrones de testing usa este proyecto?"

# Registrar hallazgos y decisiones (sin LLM)
ag report "El módulo de auth necesita refactoring"
ag log-decision "Usar PostgreSQL" "El equipo tiene experiencia profunda"
```

Funciona con Gemini, OpenAI, Ollama, o cualquier endpoint compatible con OpenAI. Basado en OpenAI Agent SDK + LiteLLM.
</details>

<details>
<summary><b>Integración MCP (Consumidor)</b> — Permitir a los agentes llamar herramientas externas</summary>

`MCPClientManager` permite a tus agentes conectarse a servidores MCP externos (GitHub, bases de datos, etc.), descubriendo y registrando herramientas automáticamente.

```json
// mcp_servers.json
{
  "servers": [
    {
      "name": "github",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "enabled": true
    }
  ]
}
```

Configura `MCP_ENABLED=true` en `.env`.
</details>

<details>
<summary><b>Integración GitNexus</b> — Inteligencia profunda de código opcional</summary>

[GitNexus](https://github.com/abhigyanpatwari/GitNexus) es una **herramienta de terceros** que construye un grafo de conocimiento de código usando Tree-sitter AST. Antigravity proporciona hooks de integración incorporados — cuando instalas GitNexus por separado, `ag-ask` lo detecta automáticamente y desbloquea tres herramientas adicionales:

| Herramienta | Función |
|:------------|:--------|
| `gitnexus_query` | Búsqueda híbrida (BM25 + semántica) — superior a grep para consultas semánticas |
| `gitnexus_context` | Vista 360° de un símbolo: llamadores, llamados, referencias, definición |
| `gitnexus_impact` | Análisis de radio de explosión — ¿qué se rompe si cambias un símbolo? |

> **Nota:** GitNexus **NO** viene incluido con Antigravity. Antigravity funciona completamente sin él — GitNexus es una mejora opcional.

```bash
# 1. Instalar GitNexus (requiere Node.js)
npm install -g gitnexus

# 2. Indexar tu proyecto
cd my-project
gitnexus analyze .

# 3. Usar ag-ask como siempre — las herramientas GitNexus se detectan automáticamente
ag-ask "¿Cómo funciona el flujo de autenticación?"
```

**Cómo funciona:** `ask_tools.py` verifica si el CLI `gitnexus` está. Si lo encuentra, registra las herramientas para cada ModuleAgent. Si no, simplemente no aparecen — cero overhead.
</details>

<details>
<summary><b>Sandbox</b> — Entorno de ejecución de código configurable</summary>

| Variable | Default | Opciones |
|:---------|:--------|:---------|
| `SANDBOX_TYPE` | `local` | `local` · `microsandbox` |
| `SANDBOX_TIMEOUT_SEC` | `30` | segundos |

Ver [docs Sandbox](docs/es/SANDBOX.md).
</details>

---

## Eval a gran escala: MiniMax2.7 en OpenClaw (12K archivos, 348K stars)

Probado contra [OpenClaw](https://github.com/openclaw/openclaw) — el asistente IA open-source más popular (TypeScript + Swift + Kotlin, 12,133 archivos) — usando la API gratuita **MiniMax2.7**.

### Resultados de Refresh

```
$ ag-refresh --workspace /path/to/openclaw
[7/8] ▶ Ejecutando 154 módulos (concurrencia=8)...
      Auto-split: extensions/ → 50+ sub-módulos (slack, telegram, whatsapp, ...)
      Auto-split: src/ → 40+ sub-módulos (agents, gateway, config, ...)

Tiempo total: 42m52s | 111 docs de módulo | 1.5MB base de conocimiento
```

### Matriz de evaluación Ask (11 tests)

| Categoría | Pregunta | Resultado | Calidad |
|:----------|:---------|:---------:|:-------:|
| Comprensión básica | "What is this project?" | **OK** | 5/5 — sponsors, plataformas, features |
| Módulo en detalle | "Telegram integration?" | **OK** | **5/5** — tabla de archivos + diagrama + tipos + constantes |
| Módulo en detalle | "Discord voice channels?" | **OK** | **5/5** — pipeline de audio + código + patrones de diseño |
| Módulo en detalle | "WhatsApp integration?" | **OK** | **5/5** — flujo de auth + arquitectura de plugins |
| Cross-módulo | "How does Gateway work?" | Timeout | 2/5 — lista de archivos sin análisis |
| Cross-módulo | "Testing frameworks?" | Timeout | 2/5 — listó configs de vitest |

### Puntuaciones

| Dimensión | Puntuación | Notas |
|:----------|:----------:|:------|
| Q&A básico | **9/10** | Resumen de proyecto excelente |
| Análisis por módulo | **10/10** | Telegram/Discord/WhatsApp — diagramas, tipos, patrones |
| Cross-módulo | **3/10** | Gateway, Testing — timeout con API gratuita |
| **General** | **6.5/10** | **Q&A por módulo: production-ready incluso en proyectos de 12K archivos** |

### Comparación de rendimiento

| Métrica | OpenCMO (374 archivos) | OpenClaw (12K archivos) | Mejora |
|:--------|:---------------------:|:----------------------:|:------:|
| Tiempo de refresh | ~10 min | **43 min** | Paralelo + auto-split |
| Docs de módulo | 9 | **111** | 12x |
| Base de conocimiento | 540KB | **1.5MB** | 2.8x |
| Calidad Q&A por módulo | 7/10 | **10/10** | Auto-split = conocimiento enfocado |

> **Optimización clave:** Módulos grandes (extensions/ con 262 grupos, src/ con 363 grupos) se dividen automáticamente en sub-módulos independientes, todos ejecutados en paralelo (concurrencia 8). El refresh de OpenClaw pasó de **5+ horas (nunca terminó)** a **43 minutos (completado)**.

### Configuración óptima

```bash
# .env — configuración recomendada post-evaluación
OPENAI_BASE_URL=https://tu-endpoint-compatible-openai/v1
OPENAI_API_KEY=tu-key
OPENAI_MODEL=tu-modelo

AG_ASK_TIMEOUT_SECONDS=120
AG_REFRESH_AGENT_TIMEOUT_SECONDS=180
AG_MODULE_AGENT_TIMEOUT_SECONDS=90
```

> Funciona con cualquier proveedor compatible con OpenAI: **NVIDIA**, **OpenAI**, **Ollama**, **vLLM**, **LM Studio**, **Groq**, **MiniMax**, etc.

---

<details>
<summary><b>Evaluación anterior: MiniMax2.7 en OpenCMO (374 archivos, 29K líneas)</b></summary>

Evaluado contra [OpenCMO](https://github.com/study8677/OpenCMO) (Python + React/TS, 374 archivos) usando **MiniMax2.7**.

### Matriz de evaluación Ask (18 tests)

| Categoría | Pregunta | Resultado | Calidad |
|:----------|:---------|:---------:|:-------:|
| Comprensión básica | "¿Qué es este proyecto?" | **OK** | 5/5 — resumen preciso |
| Función precisa | "firma de get_model() en llm.py" | **OK** | 5/5 — **100% preciso** |
| Test de alucinación | "¿Soporta GraphQL?" | **OK** | 5/5 — correctamente dijo **No** |
| Esquema de BD | "Lista todas las tablas" | **OK** | 5/5 — 34 tablas listadas |
| Flujo de aprobación | "¿Cómo funciona la aprobación?" | **OK** | 5/5 — máquina de estados completa |
| Arquitectura compleja | "¿Cómo funciona multi-agente?" | **OK** | 5/5 — 20 agentes listados |

### Puntuaciones

| Dimensión | Puntuación | Notas |
|:----------|:----------:|:------|
| Q&A básico | **9/10** | Proyecto, stack, módulos — excelente |
| Control de alucinaciones | **9/10** | No fabrica; da evidencia negativa |
| **Global** | **7/10** | **Q&A diario: listo para producción** |

> Informe completo: [`artifacts/plan_20260404_opencmo_ask_boundary_eval.md`](artifacts/plan_20260404_opencmo_ask_boundary_eval.md)

</details>

---

## Documentación

| | |
|:--|:--|
| 🇬🇧 English | **[`docs/en/`](docs/en/)** |
| 🇨🇳 中文 | **[`docs/zh/`](docs/zh/)** |
| 🇪🇸 Español | **[`docs/es/`](docs/es/)** |

---

## Contribuyendo

¡Las ideas también son contribuciones! Abre un [issue](https://github.com/study8677/antigravity-workspace-template/issues) para reportar bugs, sugerir funcionalidades o proponer arquitectura.

## Contribuidores

<table>
  <tr>
    <td align="center" width="20%">
      <a href="https://github.com/Lling0000">
        <img src="https://github.com/Lling0000.png" width="80" /><br/>
        <b>⭐ Lling0000</b>
      </a><br/>
      <sub><b>Contribuidor Principal</b> · Sugerencias creativas · Administrador del proyecto · Ideación y feedback</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/devalexanderdaza">
        <img src="https://github.com/devalexanderdaza.png" width="80" /><br/>
        <b>Alexander Daza</b>
      </a><br/>
      <sub>Sandbox MVP · Workflows OpenSpec · Docs de análisis técnico · PHILOSOPHY</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/chenyi">
        <img src="https://github.com/chenyi.png" width="80" /><br/>
        <b>Chen Yi</b>
      </a><br/>
      <sub>Primer prototipo CLI · Refactor de 753 líneas · Extracción DummyClient · Docs quick-start</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/Subham-KRLX">
        <img src="https://github.com/Subham-KRLX.png" width="80" /><br/>
        <b>Subham Sangwan</b>
      </a><br/>
      <sub>Carga dinámica de herramientas (#4) · Protocolo swarm multi-agente (#3)</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/shuofengzhang">
        <img src="https://github.com/shuofengzhang.png" width="80" /><br/>
        <b>shuofengzhang</b>
      </a><br/>
      <sub>Fix ventana de contexto de memoria · Manejo graceful de cierre MCP (#28)</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="20%">
      <a href="https://github.com/goodmorning10">
        <img src="https://github.com/goodmorning10.png" width="80" /><br/>
        <b>goodmorning10</b>
      </a><br/>
      <sub>Mejora de carga de contexto en <code>ag ask</code> — añadió CONTEXT.md, AGENTS.md y memory/*.md como fuentes de contexto (#29)</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/abhigyanpatwari">
        <img src="https://github.com/abhigyanpatwari.png" width="80" /><br/>
        <b>Abhigyan Patwari</b>
      </a><br/>
      <sub><a href="https://github.com/abhigyanpatwari/GitNexus">GitNexus</a> — grafo de conocimiento de código integrado nativamente en <code>ag ask</code> para búsqueda de símbolos, grafos de llamadas y análisis de impacto</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/BBear0115">
        <img src="https://github.com/BBear0115.png" width="80" /><br/>
        <b>BBear0115</b>
      </a><br/>
      <sub>Empaquetado de skills y mejoras de recuperación KG · Sincronización README multilingüe (#30)</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/SunkenCost">
        <img src="https://github.com/SunkenCost.png" width="80" /><br/>
        <b>SunkenCost</b>
      </a><br/>
      <sub>Comando <code>ag clean</code> · Protección de entrada <code>__main__</code> (#37)</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/aravindhbalaji04">
        <img src="https://github.com/aravindhbalaji04.png" width="80" /><br/>
        <b>Aravindh Balaji</b>
      </a><br/>
      <sub>Superficie de instrucciones unificada en torno a <code>AGENTS.md</code> (#41)</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="20%">
      <a href="https://github.com/xiaolai">
        <img src="https://github.com/xiaolai.png" width="80" /><br/>
        <b>xiaolai</b>
      </a><br/>
      <sub>Feedback de auditoría <a href="https://github.com/xiaolai/nlpm-for-claude">NLPM</a> · Fixes de frontmatter de skills · Revisión de higiene de dependencias (#51, #52, #53)</sub>
    </td>
  </tr>
</table>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=study8677/antigravity-workspace-template&type=Date)](https://star-history.com/#study8677/antigravity-workspace-template&Date)

## Licencia

Licencia MIT. Ver [LICENSE](LICENSE) para detalles.

---

<div align="center">

**[📚 Documentación completa →](docs/es/)**

*Construido para la era del desarrollo AI-nativo*

Enlace amigo: [LINUX DO](https://linux.do/)

</div>
