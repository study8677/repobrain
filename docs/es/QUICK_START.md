# 🚀 Guía de Inicio Rápido

Comienza a usar el motor de conocimiento de repositorios de RepoBrain en minutos.

## 📋 Requisitos Previos

- Python 3.10+
- pip o conda
- Git

## 🏃 Desarrollo Local

### 1. Instalar Dependencias
```bash
python3 -m venv venv
source venv/bin/activate
pip install -e ./cli -e './engine[dev]'
```

### 2. Construir la Base de Conocimiento
```bash
rb-refresh --workspace .
```

Este comando escanea el proyecto, construye `.repobrain/` y prepara la base
de conocimiento del repositorio para preguntas enrutadas sobre el codebase.

### 3. Hacer Preguntas sobre el Proyecto
```bash
rb-ask "¿Cómo funciona la autenticación en este proyecto?" --workspace .
```

El pipeline de preguntas lee el mapa estructural, enruta al agente de módulo
correcto y devuelve respuestas fundamentadas con evidencia de archivos.

## 🐳 Despliegue con Docker

### Compilar y Ejecutar
```bash
docker-compose up --build
```

Esto construye la imagen desde el checkout actual e inicia el servidor MCP del
knowledge hub contra `/app` dentro del contenedor. Reconstruye después de cambios
de código, o edita `docker-compose.yml` si quieres montar el repositorio durante
el desarrollo.

### Personalizar Docker
Edita `docker-compose.yml` para:
- Cambiar variables de entorno
- Montar volúmenes adicionales
- Exponer diferentes puertos

## 🔧 Configuración

### Variables de Entorno
Crea un archivo `.env`:

```bash
# Configuración de LLM
OPENAI_BASE_URL=https://tu-endpoint/v1
OPENAI_API_KEY=tu-clave
OPENAI_MODEL=tu-modelo

# Configuración de MCP
MCP_ENABLED=true
# Requerido antes de que rb-ask conecte servidores MCP externos
RB_ALLOW_MCP=true

# Retrieval graph: off, compact o full
RB_RETRIEVAL_MODE=compact

# Configuración personalizada
LOG_LEVEL=INFO
ARTIFACTS_DIR=artifacts
```

`ARTIFACTS_DIR` admite rutas absolutas o relativas. Las rutas relativas se
resuelven desde la raíz del repositorio.

El proyecto está optimizado para workspaces locales confiables. `RB_RETRIEVAL_MODE`
usa `compact` por defecto; `full` conserva artefactos de evidencia más ricos. Los
secretos comunes se redactan antes de escribir archivos del retrieval graph, pero
los fragmentos aún pueden incluir contenido del repositorio.

El sandbox por defecto es una comodidad de desarrollo local, no una frontera para
código no confiable. `SANDBOX_TYPE=microsandbox` es opt-in; si el runtime no está
disponible, el engine muestra un warning y vuelve a ejecución local.

### Gestión de Memoria
El agente gestiona la memoria con archivos markdown:
- `memory/agent_memory.md` (entradas crudas)
- `memory/agent_summary.md` (resumen comprimido)

Para reiniciar:

```bash
rm -f memory/agent_memory.md memory/agent_summary.md
rb-refresh --workspace .
```

## 📁 Referencia de Estructura del Proyecto

```
├── cli/                         # CLI rb ligero y plantillas
├── engine/repobrain_engine/    # Motor de conocimiento, hub, MCP server, sandbox
├── artifacts/                   # Planes, reportes y salidas de benchmark
├── memory/                      # Memoria de interacción en Markdown
└── .repobrain/                # Base de conocimiento generada en repos destino
```

Consulta [Estructura del Proyecto](../README.md#project-structure) para detalles.

## 🧪 Ejecutar Pruebas

```bash
# Ejecutar todas las pruebas
pytest engine/tests cli/tests

# Ejecutar una prueba específica del engine
pytest engine/tests/test_hub_pipeline.py -v
```

## 🐛 Solución de Problemas

### Los comandos de conocimiento no se inician
```bash
# Verifica que el CLI del engine esté instalado
rb-ask --help
rb doctor --workspace .

# Verifica la configuración OpenAI-compatible
echo $OPENAI_BASE_URL
echo $OPENAI_API_KEY
```

### Las herramientas no cargan
```bash
# Verifica que las herramientas del engine sean archivos Python válidos
ls -la engine/repobrain_engine/tools/

# Verifica errores de sintaxis
python -m py_compile engine/repobrain_engine/tools/*.py
```

### Problemas de memoria
```bash
# Verifica el archivo de memoria
cat memory/agent_memory.md

# Limpia la memoria
rm -f memory/agent_memory.md memory/agent_summary.md
```

## 🔌 Integración de MCP

Para habilitar servidores MCP:

1. Configura `MCP_ENABLED=true` en `.env`
2. Configura `RB_ALLOW_MCP=true` solo cuando confíes en los servidores
3. Configura servidores en `mcp_servers.json`
4. Vuelve a ejecutar el comando

Los servidores MCP por stdio heredan el entorno del proceso y los valores `env`
configurados. Trata cada servidor habilitado como código con permisos locales.
Consulta [Guía de Integración de MCP](MCP_INTEGRATION.md) para configuración detallada.

## 📚 Próximos Pasos

- **Aprende Filosofía**: [Filosofía del Proyecto](PHILOSOPHY.md)
- **Explora MCP**: [Integración de MCP](MCP_INTEGRATION.md)
- **Multi-Agente**: [Protocolo de Swarm](SWARM_PROTOCOL.md)
- **Avanzado**: [Características Zero-Config](ZERO_CONFIG.md)
- **Hoja de Ruta**: [Hoja de Ruta de Desarrollo](ROADMAP.md)

---

**¿Preguntas?** Consulta el [Índice Completo](README.md) o abre un issue en GitHub.
