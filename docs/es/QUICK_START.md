# 🚀 Guía de Inicio Rápido

Comienza a usar la Plantilla Workspace de Antigravity en minutos.

## 📋 Requisitos Previos

- Python 3.9+
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
ag refresh --workspace .
```

Este comando escanea el proyecto, actualiza `.antigravity/` y prepara el
knowledge hub para preguntas enrutadas sobre el codebase.

### 3. Hacer Preguntas sobre el Proyecto
```bash
ag ask "¿Cómo funciona la autenticación en este proyecto?" --workspace .
```

El pipeline de preguntas lee el mapa estructural, enruta al agente de módulo
correcto y devuelve respuestas fundamentadas con evidencia de archivos.

## 🐳 Despliegue con Docker

### Compilar y Ejecutar
```bash
docker-compose up --build
```

Esto construye la imagen de runtime publicada e inicia el servidor MCP del
knowledge hub sobre el workspace montado.

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
GOOGLE_API_KEY=tu-clave-api-aqui
GEMINI_MODEL_NAME=gemini-2.0-flash-exp

# Configuración de MCP
MCP_ENABLED=true

# Configuración personalizada
LOG_LEVEL=INFO
ARTIFACTS_DIR=artifacts
```

`ARTIFACTS_DIR` admite rutas absolutas o relativas. Las rutas relativas se
resuelven desde la raíz del repositorio.

### Gestión de Memoria
El agente gestiona la memoria con archivos markdown:
- `memory/agent_memory.md` (entradas crudas)
- `memory/agent_summary.md` (resumen comprimido)

Para reiniciar:

```bash
rm -f memory/agent_memory.md memory/agent_summary.md
ag refresh --workspace .
```

## 📁 Referencia de Estructura del Proyecto

```
├── antigravity_engine/
│   ├── agent.py         # Bucle principal del agente
│   ├── config.py        # Gestión de configuración
│   ├── memory.py        # Motor de memoria
│   ├── agents/          # Agentes especialistas
│   └── tools/           # Implementaciones de herramientas
├── artifacts/           # Artefactos de salida
├── .context/            # Base de conocimiento
└── .antigravity/        # Reglas de Antigravity
```

Consulta [Estructura del Proyecto](../README.md#project-structure) para detalles.

## 🧪 Ejecutar Pruebas

```bash
# Ejecutar todas las pruebas
pytest engine/tests cli/tests

# Ejecutar una prueba específica del engine
pytest engine/tests/test_hub_pipeline.py -v

# Con cobertura
pytest --cov=antigravity_engine engine/tests/
```

## 🐛 Solución de Problemas

### El agente no se inicia
```bash
# Verifica si las dependencias están instaladas
pip list | grep -Ei "google-genai|google-generativeai"

# Verifica que GOOGLE_API_KEY esté configurada
echo $GOOGLE_API_KEY
```

### Las herramientas no cargan
```bash
# Verifica que antigravity_engine/tools/ tenga archivos Python válidos
ls -la antigravity_engine/tools/

# Verifica errores de sintaxis
python -m py_compile antigravity_engine/tools/*.py
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
2. Configura servidores en `mcp_servers.json`
3. Reinicia el agente

Consulta [Guía de Integración de MCP](MCP_INTEGRATION.md) para configuración detallada.

## 📚 Próximos Pasos

- **Aprende Filosofía**: [Filosofía del Proyecto](PHILOSOPHY.md)
- **Explora MCP**: [Integración de MCP](MCP_INTEGRATION.md)
- **Multi-Agente**: [Protocolo de Swarm](SWARM_PROTOCOL.md)
- **Avanzado**: [Características Zero-Config](ZERO_CONFIG.md)
- **Hoja de Ruta**: [Hoja de Ruta de Desarrollo](ROADMAP.md)

---

**¿Preguntas?** Consulta el [Índice Completo](README.md) o abre un issue en GitHub.
