# 📚 Documentación de Antigravity Workspace

Bienvenido a la documentación integral de la **Plantilla Antigravity Workspace** — un starter kit de nivel producción para construir agentes autónomos de IA en Google Antigravity.

## 🎯 Navegación Rápida

### Comenzando
- **[Guía de Inicio Rápido](QUICK_START.md)** — Instalación, desarrollo local y primeros pasos
- **[Filosofía del Proyecto](PHILOSOPHY.md)** — Conceptos centrales y protocolo Artifact-First

### Características Principales
- **[Características Zero-Config](ZERO_CONFIG.md)** — Descubrimiento automático de herramientas y contexto
- **[Integración de MCP](MCP_INTEGRATION.md)** — Conexión a herramientas y fuentes de datos externas
- **[Protocolo de Swarm](SWARM_PROTOCOL.md)** — Orquestación de agentes especialistas para tareas complejas

### Planificación y Visión
- **[Hoja de Ruta de Desarrollo](ROADMAP.md)** — Progreso actual y planes futuros hasta Fase 9

## 🌟 Características Clave

### 🧠 Motor de Memoria Infinita
La resumización recursiva comprime automáticamente el historial—los límites de contexto se acabaron.

### 🛠️ Protocolo Universal de Herramientas
Patrón genérico ReAct. Solo registra cualquier función Python en `antigravity_engine/tools/`, y el Agente aprende a usarla automáticamente.

### 🎓 Inicialización de Proyectos con Skills
Usa la skill integrada `agent-repo-init` para crear un repositorio limpio desde esta plantilla.
Soporta modos `quick` y `full`, y expone un script portable en `skills/agent-repo-init/scripts/init_project.py`.

### ⚡️ Nativo de Gemini
Optimizado para velocidad de Gemini 2.0 Flash y capacidades de function calling.

### 🔌 Soporte de LLM Externo
Llama cualquier API compatible con OpenAI mediante la herramienta integrada `call_openai_chat` (soporta OpenAI, Azure, Ollama).

## 🚀 Tareas Comunes

### Quiero...

| Tarea | Documentación |
|-------|----------------|
| Empezar con el agente | [Inicio Rápido](QUICK_START.md) |
| Construir una herramienta personalizada | [Características Zero-Config](ZERO_CONFIG.md) |
| Inicializar un nuevo proyecto desde esta plantilla | [Características Zero-Config](ZERO_CONFIG.md) |
| Conectarme a un servidor MCP | [Integración de MCP](MCP_INTEGRATION.md) |
| Usar múltiples agentes | [Protocolo de Swarm](SWARM_PROTOCOL.md) |
| Entender la arquitectura | [Filosofía del Proyecto](PHILOSOPHY.md) |
| Ver qué viene | [Hoja de Ruta de Desarrollo](ROADMAP.md) |
| Consultar contexto del proyecto | `ag ask "pregunta"` / `ag refresh` |

## 📊 Estructura del Proyecto

```
.
├── .antigravity/        # 🛸 Configuración/reglas de Antigravity
├── .context/            # 📚 Base de conocimiento auto-inyectada
├── artifacts/           # 📂 Outputs del agente (planes, logs, visuales)
├── antigravity_engine/  # 🧠 Código fuente del agente
│   ├── agent.py         # Bucle principal del agente
│   ├── memory.py        # Gestor de memoria JSON
│   ├── mcp_client.py    # Integración de MCP
│   ├── swarm.py         # Orquestación multi-agente
│   ├── agents/          # Agentes especialistas
│   │   ├── base_agent.py
│   │   ├── coder_agent.py
│   │   ├── reviewer_agent.py
│   │   └── researcher_agent.py
│   ├── tools/           # Implementaciones de herramientas
│   │   ├── demo_tool.py
│   │   └── mcp_tools.py
│   └── hub/             # Knowledge Hub (escáner, agentes, pipeline)
├── tests/               # ✅ Suite de pruebas
├── scripts/             # 🧪 Scripts de utilidad
├── docker-compose.yml   # Stack de desarrollo local
├── README.md            # Página principal de aterrizaje
└── pyproject.toml       # Dependencias Python
```

## 🎓 Documentación por Rol

### Para Desarrolladores
1. Comienza con [Inicio Rápido](QUICK_START.md)
2. Aprende [Descubrimiento automático de herramientas Zero-Config](ZERO_CONFIG.md)
3. Explora el [protocolo de swarm](SWARM_PROTOCOL.md)

### Para DevOps/Despliegue
1. Lee [Inicio Rápido](QUICK_START.md) sección Docker
2. Consulta [Hoja de Ruta de Desarrollo](ROADMAP.md) Fase 9 (Enterprise Core)
3. Configura servidores MCP en [Integración de MCP](MCP_INTEGRATION.md)

### Para Arquitectos
1. Entiende [Filosofía del Proyecto](PHILOSOPHY.md)
2. Estudia arquitectura [Protocolo de Swarm](SWARM_PROTOCOL.md)
3. Revisa visión [Hoja de Ruta de Desarrollo](ROADMAP.md)

### Para Contribuidores
1. Lee [Filosofía del Proyecto](PHILOSOPHY.md)
2. Consulta [Hoja de Ruta de Desarrollo](ROADMAP.md) Fase 9
3. Abre un issue para proponer ideas

## 🔗 Recursos Externos

- 🌐 [Docs Oficial de Antigravity](https://docs.antigravity.dev/)
- 📘 [Especificación del Protocolo MCP](https://modelcontextprotocol.io/)
- 🐍 [Documentación de Python](https://docs.python.org/3/)
- 🐳 [Documentación de Docker](https://docs.docker.com/)
- 🧪 [Documentación de Pytest](https://docs.pytest.org/)

## ❓ Preguntas Frecuentes

**P: ¿Puedo usar esto con OpenAI en lugar de Gemini?**  
R: ¡Sí! Configura `OPENAI_BASE_URL` y `OPENAI_API_KEY` en `.env`. Ver detalles en [Inicio Rápido](QUICK_START.md).

**P: ¿Cómo agrego una herramienta personalizada?**  
R: ¡Coloca un archivo Python en `antigravity_engine/tools/` con tus funciones. Sin registro necesario! Ver [Características Zero-Config](ZERO_CONFIG.md).

**P: ¿Cómo inicializo un proyecto nuevo desde esta plantilla?**  
R: Usa la skill `agent-repo-init` en modo `quick` o `full`, o ejecuta `skills/agent-repo-init/scripts/init_project.py`. Ver [Características Zero-Config](ZERO_CONFIG.md).

**P: ¿Cómo despliego a producción?**  
R: ¡Usa Docker! Ver sección Docker en [Inicio Rápido](QUICK_START.md).

**P: ¿Puedo usar múltiples agentes?**  
R: ¡Sí! Usa el sistema de swarm. Ver [Protocolo de Swarm](SWARM_PROTOCOL.md).

**P: ¿Cómo agrego contexto/conocimiento?**
R: ¡Crea archivos en directorio `.context/`. Se cargan automáticamente! Ver [Características Zero-Config](ZERO_CONFIG.md).

**P: ¿Qué es el Knowledge Hub?**
R: El Knowledge Hub (`ag ask`, `ag refresh`, `ag report`, `ag log-decision`) mantiene contexto del proyecto en `.antigravity/`, haciendo todos los IDEs de IA más inteligentes. Ver el [README](../../README.md) principal.

**P: ¿Qué lenguajes soporta la detección de módulos?**
R: Python, TypeScript/JavaScript, Go, Rust, Java, Kotlin, Swift, C/C++ y C#. El escáner usa una lista unificada de extensiones para detectar módulos en todos los lenguajes soportados.

**P: ¿Qué son los facts estructurados?**
R: Desde abril 2026, `ag refresh` produce claims JSON estructurados con evidencia de fuente (ruta de archivo + rango de líneas) por módulo. `ag ask` verifica estos claims contra el fuente antes de responder, reduciendo alucinaciones y mejorando la trazabilidad.

## 🤝 Contribuyendo

Bienvenemos contribuciones en todos los niveles:

### Reportar Issues
¿Encontraste un bug? [Abre un issue](https://github.com/study8677/antigravity-workspace-template/issues)

### Sugerir Ideas
¿Tienes una idea arquitectónica? ¡Las ideas también son contribuciones!  
[Propón tu pensamiento](https://github.com/study8677/antigravity-workspace-template/issues/new)

### Enviar Código
¿Listo para codificar? Consulta la [Hoja de Ruta](ROADMAP.md) Fase 9 para áreas abiertas.

### Mejorar Documentación
¿Ves un typo o sección poco clara? ¡Envía un PR para mejorar los docs!

## 📞 Soporte

- 📖 **Documentación**: ¡Estás leyéndola! (o consulta [README.md](../../README.md))
- 🐛 **Reportes de Bugs**: [GitHub Issues](https://github.com/study8677/antigravity-workspace-template/issues)
- 💡 **Solicitudes de Características**: [GitHub Discussions](https://github.com/study8677/antigravity-workspace-template/discussions)
- 👥 **Comunidad**: [Dale una estrella al repo](https://github.com/study8677/antigravity-workspace-template) para mantenerte actualizado

## 👥 Contribuidores

- [@devalexanderdaza](https://github.com/devalexanderdaza) — Primer contribuidor. Implementó herramientas de demo, mejoró la funcionalidad del agente, propuso la hoja de ruta "Agent OS" y completó la integración MCP.
- [@Subham-KRLX](https://github.com/Subham-KRLX) — Añadió carga dinámica de herramientas y contexto (Fixes #4) y el protocolo de clúster multi‑agente (Fixes #6).
- [@SunkenCost](https://github.com/SunkenCost) — Comando `ag clean` y protección de entrada `__main__` (#37).
- [@aravindhbalaji04](https://github.com/aravindhbalaji04) — Superficie de instrucciones unificada en torno a `AGENTS.md` (#41).
- [@xiaolai](https://github.com/xiaolai) — Aportó feedback de auditoría con [NLPM](https://github.com/xiaolai/nlpm-for-claude), mejorando frontmatter de skills e higiene de dependencias (#51, #52, #53).

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Ver [LICENSE](../../LICENSE) para detalles.

---

**Última Actualización:** Abril 2026
**Versión:** Fase 10 (Knowledge Hub) ✅ — pipeline de evidencia estructurada + soporte multi-lenguaje

**¡Feliz construcción con Antigravity!** 🚀

Enlace amigo: [LINUX DO](https://linux.do/)
