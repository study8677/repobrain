#+#+#+#+-----------------------------------------------------------------
# 🧠 Análisis Profundo del Proyecto Antigravity Workspace Template (ES)

**Artifact:** `artifacts/analysis/deep_analysis_antigravity_2025-12-24_es.md`  
**Fecha:** 2025-12-24  
**Objeto:** Análisis técnico del workspace + cambios implementados (instaladores + OpenSpec).

---

<a id="installer-scripts"></a>
## 🧩 Cambios implementados: installer scripts

Este workspace ya incluye instaladores cross-platform para bajar fricción de onboarding:

- **Linux/macOS:** `install.sh`
  - Verifica `python3` y versión mínima (≥3.8)
  - Verifica `git`
  - Crea `venv/` y ejecuta `pip install -r requirements.txt`
  - Inicializa `.env` si no existe y crea `artifacts/`

- **Windows:** `install.bat`
  - Verifica `python` en PATH y `git`
  - Crea `venv\` y activa `venv\Scripts\activate.bat`
  - Instala dependencias e inicializa `.env` y `artifacts\`

Además, el cambio fue formalizado y archivado vía OpenSpec:

- Propuesta/implementación: `openspec/changes/archive/2025-12-24-add-installer-script/`
- Spec resultante: `openspec/specs/deployment/spec.md` (capacidad de instalación cross-platform)

## Índice

- [Visión general](#vision-general)
- [Filosofía: Artifact-First y Zero-Config](#filosofia)
- [Arquitectura técnica](#arquitectura-tecnica)
  - [Memoria (JSON + resumen incremental)](#memoria)
  - [Think → Act → Reflect (loop real)](#think-act-reflect)
  - [Descubrimiento de tools (auto-load)](#tool-discovery)
  - [Inyección de contexto (.context)](#context-injection)
- [Swarm multi-agente (Router-Worker)](#swarm)
- [Integración MCP (Model Context Protocol)](#mcp)
- [OpenSpec (cambios, specs, archivado)](#openspec)
- [Cambios implementados: installer scripts](#installer-scripts)
- [Notas de precisión (qué está verificado)](#precision)
- [Conclusión](#conclusion)

---

<a id="vision-general"></a>
## 🎯 Visión General

Este es un **proyecto revolucionario** que transforma el paradigma del desarrollo con IA. No es simplemente otro wrapper de LangChain ni una colección de scripts: es una **arquitectura cognitiva completa** diseñada para convertir cualquier IDE compatible en un "arquitecto experto" mediante el poder de la conciencia contextual.

---

<a id="filosofia"></a>
## 🌟 Filosofía Central: "Artifact-First" & "Cognitive-First"

### El Problema Que Resuelve

En el ecosistema actual de IDEs con IA (Cursor, Google Antigravity), existe una paradoja:
- **Las herramientas son poderosas**, pero los proyectos vacíos son débiles
- **Los desarrolladores pierden tiempo** configurando manualmente contexto, reglas y estructura
- **La IA necesita recordatorios constantes** sobre dónde colocar archivos, cómo estructurar código, qué estándares seguir

### La Solución: "Clone → Rename → Prompt"

El proyecto **pre-embebe** toda la arquitectura cognitiva en archivos de configuración que el IDE lee automáticamente:

1. **[`.antigravity/rules.md`](.antigravity/rules.md )**: Define la personalidad, directivas y protocolos del agente
2. **[`.cursorrules`](.cursorrules )**: Apunta al archivo de reglas para compatibilidad cross-IDE
3. **[`CONTEXT.md`](CONTEXT.md )**: Proporciona documentación completa y optimizada para IA
4. **[`.context`](.context )**: Base de conocimiento auto-inyectable

**Resultado**: Al abrir el proyecto, el IDE ya "sabe" que es un Senior Developer Advocate especializado en Gemini, que debe pensar antes de actuar, y que debe seguir el protocolo Artifact-First.

---

<a id="arquitectura-tecnica"></a>
## 🏗️ Arquitectura Técnica

<a id="memoria"></a>
### 1. **Memoria persistente (JSON + resumen incremental)**

```
agent_memory.json
├── summary: resumen consolidado (string)
└── history: lista de mensajes (role/content/metadata)
```

**Cómo funciona (verificado en código):**

- La clase `MemoryManager` (en `src/memory.py`) persiste `summary` + `history` en un único archivo JSON.
- `get_context_window(system_prompt, max_messages, summarizer=...)` mantiene los últimos `max_messages` mensajes “verbatim” y resume el resto mediante `summarizer(old_messages, previous_summary)`.
- En `src/agent.py`, el `GeminiAgent` usa `max_messages=10` y un `summarizer` que llama al modelo (método `summarize_memory`) con una instrucción explícita de **≤120 palabras**.

**Qué implica:** no es un vector DB ni un RAG completo; es una memoria conversacional compactada de forma incremental. Aun así, evita el “amnesia” típico al conservar decisiones y contexto en `summary`.

<a id="think-act-reflect"></a>
### 2. **Think → Act → Reflect (loop real)**

El loop existe y está implementado en `src/agent.py`, pero es **pragmático** (no “mágico”):

**Think**
- Carga conocimiento desde `.context/*.md` (solo archivos Markdown en el directorio raíz de `.context`, no subcarpetas).
- Construye un `system_prompt` que mezcla el contexto + una instrucción de estilo (“Artifact-First”, conciso, táctico).
- Pide a `MemoryManager.get_context_window(..., max_messages=10, summarizer=self.summarize_memory)` que compacte historial.
- Imprime un bloque de `<thought>` (solo logging; no es una primitiva del modelo).

**Act**
- Persiste la entrada del usuario en `agent_memory.json` vía `MemoryManager.add_entry("user", task)`.
- Construye dinámicamente una lista de tools (`_get_tool_descriptions()`), alimentando al modelo con docstrings.
- Llama al modelo con un prompt que le pide **una de dos salidas**:
  - Respuesta final directa, o
  - Solicitud de tool call con esquema JSON:
    - `{"action": "<tool_name>", "args": {"param": "value"}}`
- Extrae tool calls con `_extract_tool_call()` soportando:
  1) JSON con `action/tool` + `args/input`
  2) Línea `Action: <tool_name>` (sin args)
- Ejecuta **como máximo una** herramienta en esa iteración, registra la observación en memoria, y hace un “follow-up” al modelo con `Tool '<name>' observation: ...` prohibiendo tool calls adicionales.

**Reflect**
- Actualmente solo imprime el tamaño del historial (`Reflecting on N past interactions...`). No aplica “self-improvement” automático.

Nota: El concepto de *artifacts*, pruebas automáticas y disciplina de ejecución puede estar definido por reglas del entorno/IDE, pero **no está impuesto por este módulo Python**.

<a id="tool-discovery"></a>
### 3. **Zero-Config Tool Discovery (auto-load real)**

**Problema tradicional**: Agregar herramientas requiere:
1. Escribir la función
2. Registrarla manualmente en un diccionario
3. Definir esquemas de validación
4. Actualizar documentación

**Solución Antigravity**:
```python
# src/tools/my_tool.py
def analyze_sentiment(text: str) -> str:
    """Analyzes sentiment of text.
    
    Args:
        text: Input text
        
    Returns:
        Sentiment label
    """
    return "positive" if len(text) > 10 else "neutral"
```

**Reinicia el agente** → la herramienta se importa y queda disponible automáticamente.

**Mecanismo (verificado en `src/agent.py`):**

- Escanea `src/tools/*.py` (omite archivos que empiezan por `_`).
- Importa cada módulo dinámicamente con `importlib.util.spec_from_file_location`.
- Registra funciones **públicas** (nombre no comienza con `_`) y **definidas en ese módulo**.
- Expone el “catálogo” de tools al modelo como texto con `_get_tool_descriptions()`, que hoy usa principalmente docstrings (no genera un JSON Schema formal).

**Limitación deliberada:** la extracción de tool calls es simple (JSON `action/args` o `Action:`) y la ejecución es de una sola herramienta por iteración.

<a id="context-injection"></a>
### 4. **Auto Context Injection (.context)**

**Comportamiento real:** el agente concatena **solo** los archivos `*.md` en la raíz de `.context/` (no recorre subdirectorios). Cada archivo se envuelve con un separador `--- <filename> ---`.

Ejemplo (lo que sí se carga):
```
.context/
├── coding_standards.md
├── project_notes.md
└── security_policies.md
```

**Inyección:** este bloque se preprende al system prompt durante `think()` (ver `GeminiAgent._load_context()` + `GeminiAgent.think()`).

**Caso de uso**: Una empresa puede clonar este template, agregar sus estándares a [`.context`](.context ), y cada agente automáticamente seguirá las políticas corporativas.

---

<a id="swarm"></a>
## 🔥 Multi-Agent Swarm Protocol

### Arquitectura Router-Worker

El proyecto implementa un sistema de **orquestación multi-agente** inspirado en patrones enterprise:

```
User Task → Router Agent (Coordinator)
              ├─→ Coder Agent (Implementation)
              ├─→ Reviewer Agent (Quality Assurance)
              └─→ Researcher Agent (Information Gathering)
```

### Agentes Especialistas

#### 🧭 **Router Agent**
- **Rol**: Task analyzer, strategist, conductor
- **Capacidades**:
  - Análisis de complejidad de tareas
  - Descomposición estratégica
  - Distribución de subtareas
  - Síntesis de resultados

#### 💻 **Coder Agent**
- **Especialización**: Implementación de código
- **Estándares**:
  - Type hints obligatorios
  - Google-style docstrings
  - Tests comprehensivos
  - Clean code arquitectura

#### 🔍 **Reviewer Agent**
- **Foco**: Quality assurance
- **Evaluaciones**:
  - Code quality assessment
  - Security analysis (detecta patrones peligrosos como `eval()`, `exec()`)
  - Performance optimization
  - Best practices verification

#### 📚 **Researcher Agent**
- **Función**: Information synthesis
- **Outputs**: Context-rich research reports

### Ejemplo de Flujo Real

```
User: "Build a calculator and review it for security"

Router: Analyzes → Decomposes into:
  1. Implementation task
  2. Security review task

Router → Coder: "Implement calculator with +, -, *, /"
Coder: Writes code + tests → Saves to artifacts/

Router → Reviewer: "Review calculator for security"
Reviewer: Analyzes code → Finds no vulnerabilities → Report

Router: Synthesizes → Returns complete summary
```

**Innovación**: Los agentes **coordinan artifacts**. Si Coder genera `calculator.py`, Reviewer automáticamente lo encuentra y analiza.

---

<a id="mcp"></a>
## 🔌 MCP Integration (Model Context Protocol)

### ¿Qué es MCP?

Un protocolo universal para conectar LLMs a fuentes de datos externas:
- **GitHub**: Gestión de repos, issues, PRs
- **Databases**: Query directo a PostgreSQL, MySQL
- **Filesystems**: Operaciones de archivos locales o remotos
- **Custom servers**: APIs propietarias

### Implementación en Antigravity

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

**Auto-discovery de herramientas MCP**:
1. El agente se conecta a servidores MCP al inicio
2. Solicita lista de herramientas disponibles
3. Las registra dinámicamente
4. El agente puede usarlas como cualquier otra herramienta

**Transportes soportados**:
- **stdio**: Comunicación vía stdin/stdout
- **HTTP**: APIs REST estándar
- **SSE (Server-Sent Events)**: Streams en tiempo real

---

<a id="openspec"></a>
## 📚 OpenSpec Integration

### Sistema de Gestión de Cambios

El proyecto integra **OpenSpec**, un framework para propuestas de cambio estructuradas:

```
openspec/
├── project.md              # Convenciones del proyecto
├── specs/                  # "Source of truth" - Qué está construido
│   └── [capability]/
│       ├── spec.md         # Requirements & scenarios
│       └── design.md       # Decisiones técnicas
└── changes/                # Propuestas - Qué debe cambiar
    └── [change-id]/
        ├── proposal.md     # Why, what, impact
        ├── tasks.md        # Implementation checklist
        ├── design.md       # Technical decisions (opcional)
        └── specs/          # Delta changes
            └── [capability]/
                └── spec.md # ADDED/MODIFIED/REMOVED
```

### Workflow de 3 Etapas

**Stage 1: Creating Changes**
- Scaffold propuesta con CLI: `openspec init`
- Escribir deltas de specs con `## ADDED|MODIFIED|REMOVED Requirements`
- Validar: `openspec validate <change-id> --strict`

**Stage 2: Implementing Changes**
- Leer `proposal.md`, `design.md`, `tasks.md`
- Implementar secuencialmente
- Actualizar checklist: `- [x]` cuando completo

**Stage 3: Archiving Changes**
- Después de deployment: `openspec archive <change-id>`
- Mueve propuesta a `archive/`
- Actualiza specs en `specs/`

**Ventaja**: Separa "qué se propone" de "qué está construido", facilitando auditorías y rollbacks.

---

## 🛠️ Características Enterprise

### 1. **DevOps Ready**

**Docker multi-stage (ver `Dockerfile`)**:
```dockerfile
FROM python:3.12-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
COPY . .
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
CMD ["python", "src/agent.py"]
```

**Docker Compose (ver `docker-compose.yml`)**:
```yaml
version: '3.8'

services:
  agent:
    build: .
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - AGENT_NAME=ProductionAgent
      - DEBUG_MODE=true
    volumes:
      - ./agent_memory.json:/app/agent_memory.json
    restart: unless-stopped
```

**CI (GitHub Actions, ver `.github/workflows/test.yml`)**:
```yaml
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.12"
      - run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      - run: |
          pytest tests/
```

### 2. **LLM Agnostic**

El proyecto no está atado a Gemini. Soporta:

```python
# Via herramienta call_openai_chat
- OpenAI GPT-4
- Azure OpenAI
- Ollama (local)
- Cualquier API OpenAI-compatible
```

**Configuración**:
```env
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
```

### 3. **Testing Philosophy**

```
tests/
├── conftest.py          # Ensures src/ is on sys.path
├── test_agent.py        # Core agent logic
├── test_mcp.py          # MCP integration surface
├── test_memory.py       # Memory management
└── test_swarm.py        # Multi-agent orchestration
```

**CI verificado**: `.github/workflows/test.yml` ejecuta `pytest tests/` en pushes/PRs contra `main`.

### 4. **Type Safety**

El código usa type hints en múltiples módulos (por ejemplo `src/agent.py`, `src/mcp_client.py`), pero **no hay** un paso de type-checking (mypy/pyright) configurado en el workflow actual.

---

## 🚀 Roadmap & Estado Actual

### ✅ **Fases Completadas (1-8)**

| Fase | Logros Clave |
|------|--------------|
| **1. Foundation** | Scaffold, config, memory JSON |
| **2. DevOps** | Docker, CI/CD, environment vars |
| **3. Antigravity Compliance** | Rules integration, artifact protocol |
| **4. Advanced Memory** | Recursive summarization, buffer management |
| **5. Cognitive Architecture** | Generic tool dispatch, function calling |
| **6. Dynamic Discovery** | Auto-load tools & context |
| **7. Multi-Agent Swarm** | Router-Worker pattern |
| **8. MCP Integration** | Stdio/HTTP/SSE transports, auto-discovery |

### 🚀 **Fase 9: Enterprise Core (En Progreso)**

**Visión**: Transformar de "workspace" a **"Agent OS"**

#### **9A: Sandboxed Execution** 🔒
```python
with SandboxEnvironment() as sandbox:
    sandbox.execute(untrusted_code)
    # Isolated filesystem, network, memory limits
```

**Propósito**: Ejecutar código no confiable de forma segura (ej: user-generated scripts, external plugins).

#### **9B: Orchestrated Flows** 🔀
```yaml
workflow:
  fetch_data:
    agent: DataFetcher
    output: raw_data
  
  analyze_trends:
    agent: DataAnalyst
    depends_on: fetch_data
    input: "{fetch_data.output}"
  
  generate_report:
    agent: ReportGenerator
    depends_on: analyze_trends
```

**Propósito**: Definir workflows complejos multi-step con dependencias, retries, monitoring.

#### **9C: Agent Marketplace** 🏪
```bash
antigravity install code-reviewer-pro
antigravity install security-scanner
```

**Propósito**: Ecosistema de agentes reutilizables (similar a npm/pip para agentes).

---

## 💎 Bondades & Innovaciones Únicas

### 1. **Cognitive-First, No Code-First**

A diferencia de frameworks tradicionales donde agregas IA a código existente, aquí **el código existe para servir a la arquitectura cognitiva**. El agente piensa primero, actúa después.

### 2. **Transparencia Total**

**Anti-LangChain**: No hay abstracciones mágicas. Puedes leer:
- [`src/agent.py`](src/agent.py ): ~300 líneas, todo el loop principal
- [`src/memory.py`](src/memory.py ): Implementación completa del sistema de memoria
- [`src/swarm.py`](src/swarm.py ): Orquestador multi-agente sin dependencias externas

### 3. **Documentation as Code**

La documentación no es un PDF olvidado. Es **código vivo**:
- [`CONTEXT.md`](CONTEXT.md ): Optimizado para parseo por IA
- [`.antigravity/rules.md`](.antigravity/rules.md ): Define comportamiento del agente
- [`openspec/project.md`](openspec/project.md ): Source of truth de convenciones

### 4. **Polyglot Ready**

Aunque está en Python, el patrón es aplicable a cualquier lenguaje:
- Rust → `antigravity-workspace-template-rust`
- TypeScript → `antigravity-workspace-template-ts`
- Go → `antigravity-workspace-template-go`

**Convención universal**: [`.antigravity/rules.md`](.antigravity/rules.md ) + [`artifacts`](artifacts ) + tool auto-discovery.

### 5. **Enterprise Security**

- **Artifact isolation**: Outputs nunca sobrescriben código sin revisión
- **Tool sandboxing**: Herramientas peligrosas (ej: `exec`) pueden restringirse
- **Audit trail**: Todos los cambios generan logs en `artifacts/logs/`

### 6. **Collaborative AI**

El Swarm Protocol permite **división del trabajo** como en equipos humanos:
- **Coder**: Escribe código rápido
- **Reviewer**: Crítica constructiva
- **Researcher**: Contextualiza problemas

Resultado: **Outputs de mayor calidad** que un solo agente monolítico.

---

## 🎓 Casos de Uso Reales

### 1. **Startup Accelerator**

Clonar template → Agregar contexto de negocio en [`.context`](.context ) → El agente construye MVP completo con:
- Backend API (FastAPI/Flask)
- Tests comprehensivos
- Deployment scripts
- Documentación

**Tiempo**: Horas en lugar de semanas.

### 2. **Enterprise Compliance**

Grandes empresas tienen estándares estrictos:
```
.context/enterprise/
├── coding_standards.md      # PEP 8 + company rules
├── security_checklist.md    # OWASP guidelines
└── deployment_protocol.md   # How to deploy safely
```

Todos los agentes automáticamente siguen las políticas sin recordatorios manuales.

### 3. **Research & Prototyping**

Investigadores pueden:
1. Describir experimento en lenguaje natural
2. El agente genera:
   - Script de recolección de datos
   - Pipeline de análisis
   - Visualizaciones
   - Informe en Markdown

**Ventaja**: Foco en ciencia, no en ingeniería de software.

### 4. **Code Review as a Service**

Usando el **Reviewer Agent** standalone:
```python
reviewer = ReviewerAgent()
report = reviewer.analyze("path/to/codebase")
# Returns: security issues, performance bottlenecks, style violations
```

Integrable en CI/CD para code reviews automatizadas.

---

## 🌍 Comunidad & Contribuciones

### Contributors Destacados

**[@devalexanderdaza](https://github.com/devalexanderdaza)**: 
- Primer contribuidor
- Implementó demo tools ([`scripts/demo_tools.py`](scripts/demo_tools.py ))
- Propuso roadmap "Agent OS"
- Completó integración MCP

**[@Subham-KRLX](https://github.com/Subham-KRLX)**:
- Dynamic tool loading
- Context auto-injection
- Multi-agent swarm protocol

### Filosofía de Contribución

> **"Ideas are contributions too!"**

No necesitas escribir código. Puedes contribuir:
- **Reportando bugs**
- **Sugiriendo features** (ej: "¿Qué tal un Debugger Agent?")
- **Proponiendo arquitectura** (Fase 9)
- **Mejorando docs** (typos, claridad)

---

## 📊 Comparación con Alternativas

| Feature | Antigravity Template | LangChain | AutoGPT |
|---------|---------------------|-----------|---------|
| **Transparency** | ✅ <300 LOC core | ❌ 100k+ LOC | ⚠️ Medium |
| **Memory** | ✅ Recursive summarization | ⚠️ Basic buffer | ✅ Vector DB |
| **Multi-Agent** | ✅ Native swarm | ⚠️ Via extensions | ❌ Single agent |
| **MCP Support** | ✅ Native | ❌ No | ❌ No |
| **Zero-Config Tools** | ✅ Auto-discovery | ❌ Manual registration | ❌ Manual |
| **Enterprise Ready** | ✅ Docker + CI/CD | ⚠️ Requires setup | ❌ Prototype-only |
| **Artifact-First** | ✅ Mandatory protocol | ❌ No | ⚠️ Optional |

---

## 🔮 Visión Futura

### El "Agent OS" Concept

Imagina un sistema operativo donde:
- **Cada aplicación** es un agente especializado
- **El kernel** es el SwarmOrchestrator
- **El filesystem** son artifacts estructurados
- **Las APIs** son MCP servers

**Ejemplo de uso**:
```bash
$ antigravity run "Analyze sales data and email report to CFO"

[System] Loading agents...
  ✓ DataAnalyst Agent
  ✓ EmailSender Agent
  ✓ ChartGenerator Agent

[Orchestrator] Workflow:
  1. DataAnalyst: Query sales DB
  2. ChartGenerator: Create visualizations
  3. EmailSender: Send report

[Progress] ████████████████ 100%
[Complete] Email sent to cfo@company.com
[Artifacts] Saved to artifacts/sales_report_2025-01/
```

---

<a id="precision"></a>
## 🧾 Notas de precisión (qué está verificado)

**Verificado directamente en el repositorio (lectura de código/config):**
- Auto-load de tools desde `src/tools/*.py` y exposición al modelo vía docstrings (`src/agent.py`).
- Memoria persistente con resumen incremental y ventana de contexto (`src/memory.py` + `GeminiAgent.summarize_memory`).
- Orquestación Swarm Router-Worker (`src/swarm.py` + `src/agents/*`).
- Integración MCP multi-transporte y naming con prefijos (`src/mcp_client.py`, `src/tools/mcp_tools.py`, `src/config.py`).
- Contenedorización y CI básico con pytest (`Dockerfile`, `docker-compose.yml`, `.github/workflows/test.yml`).
- Instaladores `install.sh` + `install.bat`.

**Interpretaciones / visión (no garantizado por el runtime actual):**
- Cualquier afirmación de “enforcement” de artifacts, auditoría automática o ejecución obligatoria de tests depende del entorno/operativa, no del loop Python actual.
- Comparativas con otros frameworks (LangChain/AutoGPT) son de alto nivel; para precisión cuantitativa habría que medir con benchmarks y repos específicos.

---

<a id="conclusion"></a>
## 🎯 Conclusión

**Antigravity Workspace Template** no es solo código: es una **filosofía completa** de cómo construir sistemas con IA de manera:

✅ **Transparente**: Sin abstracciones mágicas  
✅ **Escalable**: De prototipo a producción sin refactoring  
✅ **Colaborativa**: Multi-agent swarm emula equipos humanos  
✅ **Auditable**: Artifact-First garantiza trazabilidad  
✅ **Extensible**: Zero-config tool discovery  
✅ **Universal**: LLM-agnostic, MCP-compatible  

**El proyecto demuestra** que la verdadera innovación no está en apilar más capas de abstracción, sino en diseñar arquitecturas donde la IA y los humanos colaboran de forma natural, predecible y verificable.

---

**TL;DR**: Este proyecto transforma cualquier IDE en un "arquitecto senior" que piensa antes de actuar, genera evidencia de su trabajo, y colabora con agentes especialistas. Es el resultado de aplicar principios enterprise a desarrollo con IA, creando un template que realmente cumple la promesa de "clone → rename → prompt". 🚀
