<div align="center">

<img src="docs/assets/logo.svg" alt="RepoBrain" width="200"/>

# RepoBrain

Convierte tu código en conocimiento para responder con evidencia.

<sub>Anteriormente conocido como <b>Antigravity Workspace Template</b> — el mismo proyecto, nuevo nombre.</sub>

[English](README.md) · [中文](README_CN.md) · **Español**

[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![CI](https://img.shields.io/github/actions/workflow/status/study8677/repobrain/test.yml?style=for-the-badge&label=CI)](https://github.com/study8677/repobrain/actions)
[![DeepWiki](https://img.shields.io/badge/DeepWiki-Docs-blue?style=for-the-badge&logo=gitbook&logoColor=white)](https://deepwiki.com/study8677/repobrain)
[![NLPM](https://img.shields.io/badge/NLPM-audited-7C3AED?style=for-the-badge)](https://github.com/xiaolai/nlpm-for-claude)

<img src="docs/assets/demo.gif" alt="Demo de rb-ask — respuestas fundamentadas con rutas de archivo y números de línea" width="800"/>

</div>

RepoBrain te ayuda a entender un repositorio, localizar implementaciones y
obtener respuestas con referencias al código. El conocimiento se guarda en
`.repobrain/` y se comparte entre los IDEs y agentes compatibles.

## Filosofía del proyecto

> El techo de capacidad de un AI Agent = **la calidad del contexto que puede leer.**

El motor es el núcleo: `rb-refresh` despliega un clúster multi-agente que lee tu código autónomamente — cada módulo obtiene su propio Agent que genera documentación de conocimiento. `rb-ask` enruta preguntas al Agent correcto, con respuestas basadas en código real con rutas de archivo y números de línea.

**En vez de darle a Claude Code / Codex un `grep` del repositorio para que busque por su cuenta, dale un ChatGPT para tu repositorio.**

```
Enfoque tradicional:                    Enfoque RepoBrain:
  CLAUDE.md = 5000 líneas de docs         Claude Code llama ask_project("¿cómo funciona auth?")
  El agente lee todo, olvida la mitad     Router → ModuleAgent lee código real, devuelve respuesta exacta
  La tasa de alucinación sigue alta       Fundamentado en código real, rutas de archivo y git
```

| Problema | Sin RepoBrain | Con RepoBrain |
|:---------|:---------------|:----------------|
| El agente olvida el estilo de código | Repites las mismas correcciones | Lee `.repobrain/conventions.md` — lo hace bien a la primera |
| Incorporar un codebase nuevo | El agente adivina la arquitectura | `rb-refresh` → ModuleAgents aprenden cada módulo |
| Cambiar entre IDEs | Reglas diferentes en cada uno | Una carpeta `.repobrain/` — todos los IDEs la comparten |
| Preguntar "¿cómo funciona X?" | El agente lee archivos al azar | `ask_project` MCP → Router enruta al ModuleAgent responsable |

La arquitectura son **archivos + un motor Q&A en vivo**, no plugins. Portable entre cualquier IDE, cualquier LLM, cero lock-in.

Consulta la [filosofía completa del proyecto](docs/es/PHILOSOPHY.md).

## Inicio rápido

Pide a un asistente de IA que pueda ejecutar comandos en tu proyecto que instale RepoBrain:

> Lee [AI_INSTALL.md](https://github.com/study8677/repobrain/blob/main/AI_INSTALL.md) y sigue sus instrucciones para instalar RepoBrain en este proyecto.

La guía instala las herramientas, configura el modelo, construye la base de
conocimiento y verifica una respuesta. Una CLI con sesión iniciada, como Trae,
puede servir de backend sin una API key adicional; también se admite una API
compatible con OpenAI. Requiere Python 3.10+, un repositorio Git con al menos un
commit y un árbol de trabajo limpio antes de actualizar.

Para instalación por plataforma o configuración manual, consulta
[la guía de instalación](INSTALL.md) y [el inicio rápido](docs/es/QUICK_START.md).
Un proyecto existente no necesita ejecutar primero `rb init` ni `rb-init`.

## Uso diario

Tras instalar y configurar, ejecuta estos comandos en la carpeta del proyecto:

```bash
rb-refresh
rb-ask "¿Cómo funciona la autenticación en este proyecto?"
```

`rb-refresh` elige automáticamente la primera construcción, la actualización de
los grupos afectados por cambios confirmados o la continuación de una tarea
interrumpida compatible. Si la base ya está al día, termina sin llamar al modelo.
Después de un fallo, ejecuta el mismo comando para continuar.

Solo para regenerar todo el conocimiento:

```bash
rb-refresh --full
```

`rb-ask` responde con evidencia de código desde la base existente. Avisa si hay
commits más recientes, pero no actualiza la base durante una pregunta.

Ejemplos de preguntas:

- ¿Dónde se implementa esta API y qué componentes la llaman?
- ¿Qué recorrido siguen los datos desde la interfaz hasta el backend?
- ¿Qué módulos se ven afectados al cambiar esta función?

## Cómo funciona

```text
Código → rb-refresh → conocimiento en .repobrain/ → rb-ask → respuesta con referencias
```

RepoBrain agrupa código relacionado, genera conocimiento por módulo y selecciona
el contexto relevante para cada pregunta. La base vive en tu proyecto y se
comparte entre los IDEs compatibles. Las actualizaciones se preparan en una
versión separada y solo se activan al completarse; un fallo conserva la versión usable.

La primera construcción usa el modelo configurado y puede tardar varios minutos
o más en repositorios grandes. Confirma los cambios locales o usa `git stash`
antes de actualizar. Las reglas de IDE y las plantillas de proyectos son
opcionales; consulta [la referencia de uso](docs/es/USAGE.md).

## Compatibilidad

| Uso | Entornos | Conexión |
|:----|:---------|:---------|
| Plugins nativos | Claude Code, Codex CLI | Comandos slash para configurar, actualizar y preguntar. |
| IDEs compatibles | Cursor, Windsurf, Gemini CLI, VS Code + Copilot, Cline, Aider, DeepSeek Harness | Archivos de contexto compartidos, CLI o un cliente MCP. |
| Otros agentes y scripts | Entornos que ejecutan comandos o llaman herramientas MCP | Salida CLI/JSON o `rb-mcp` opcional. |

Los comandos por plataforma, la salida JSON y el registro MCP están en
[la referencia de uso](docs/es/USAGE.md) y [INSTALL.md](INSTALL.md).

## Evaluación

Una comparación en Flask, ripgrep, Vite y Prometheus mantuvo el mismo acceso al
código y la misma ruta de modelo para RepoBrain y CodeGraph + Trae. El
[informe completo en inglés](benchmarks/codegraph-comparison/results/latest-v2-full-report.md)
incluye precisión, tiempo de consulta, tokens y coste de construcción inicial.
Los resultados corresponden a ese experimento; generar conocimiento con IA e
indexar un grafo estático son cargas de trabajo diferentes.

## Documentación

- [Instalación y resolución de problemas](INSTALL.md)
- [Comandos, JSON e integraciones opcionales](docs/es/USAGE.md)
- [Arquitectura de conocimiento y preguntas](docs/es/SWARM_PROTOCOL.md)
- [Herramientas MCP externas](docs/es/MCP_INTEGRATION.md) · [Configuración del sandbox](docs/es/SANDBOX.md)
- [Cambios de versión](CHANGELOG.md)
- Documentación completa: [Español](docs/es/README.md) · [English](docs/en/README.md) · [中文](docs/zh/README.md)

**Feedback de auditoría NLPM** — Este repositorio se ha beneficiado de [NLPM](https://github.com/xiaolai/nlpm-for-claude), un linter de programación en lenguaje natural para plugins de Claude Code, skills y definiciones de agentes creado por [xiaolai](https://github.com/xiaolai). Su auditoría ayudó a encontrar mejoras útiles en frontmatter de skills e higiene de dependencias.

---

## Contribuyendo

¡Las ideas también son contribuciones! Abre un [issue](https://github.com/study8677/repobrain/issues) para reportar bugs, sugerir funcionalidades o proponer arquitectura.

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
      <sub>Mejora de carga de contexto en <code>rb ask</code> — añadió CONTEXT.md, AGENTS.md y memory/*.md como fuentes de contexto (#29)</sub>
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
      <sub>Comando <code>rb clean</code> · Protección de entrada <code>__main__</code> (#37)</sub>
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

[![Star History Chart](https://api.star-history.com/svg?repos=study8677/repobrain&type=Date)](https://star-history.com/#study8677/repobrain&Date)

## Licencia

Licencia MIT. Ver [LICENSE](LICENSE) para detalles.

---

<div align="center">

**[📚 Documentación completa →](docs/es/)**

*Construido para la era del desarrollo AI-nativo*

Enlace amigo: [LINUX DO](https://linux.do/)

</div>
