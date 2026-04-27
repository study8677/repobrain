# Especificaciones de Ejecución en Sandbox

## Descripción General

El módulo sandbox proporciona entornos seguros y configurables para ejecutar código generado por el agente. Permite diferentes niveles de aislamiento y control de recursos.

**Principio clave:** Zero-Config por defecto (ejecución local), con opt-in para Docker si se requiere mayor aislamiento.

## Inicio Rápido

### Ejecución Local (Por Defecto)

Sin configuración adicional. El código se ejecuta en un subprocess aislado:

```python
from antigravity_engine.sandbox.factory import get_sandbox

sandbox = get_sandbox()
result = sandbox.execute(code="print(2 + 2)", language="python", timeout=30)
print(result.stdout)
```

El agente:
- Genera código Python
- Lo ejecuta de forma segura en un subprocess aislado
- Devuelve el resultado

### Ejecución Docker (Opt-In)

Para mayor aislamiento (filesystem, red, recursos):

```bash
export SANDBOX_TYPE=docker
export DOCKER_IMAGE=antigravity-sandbox:latest

# Primero, construye la imagen (opcional; usa python:3.11-slim por defecto)
docker build -f Dockerfile.sandbox -t antigravity-sandbox:latest .

# Luego usa la misma API de Python mostrada arriba
# para ejecutar código dentro del runtime Microsandbox
```

## Configuración

Todas las variables de entorno se controlan mediante variables de entorno.

### Variables Principales

| Variable | Defecto | Descripción |
|----------|---------|-------------|
| `SANDBOX_TYPE` | `local` | Entorno: `local`, `docker`, `e2b` (futuro) |
| `SANDBOX_TIMEOUT_SEC` | `30` | Tiempo máximo de ejecución (segundos) |
| `SANDBOX_MAX_OUTPUT_KB` | `10` | Tamaño máximo de salida antes de truncado (KB) |

### Variables Específicas de Docker

| Variable | Defecto | Descripción |
|----------|---------|-------------|
| `DOCKER_IMAGE` | `python:3.11-slim` | Imagen base Docker |
| `DOCKER_NETWORK_ENABLED` | `false` | Permitir acceso a red |
| `DOCKER_CPU_LIMIT` | `0.5` | Límite de CPU (cores) |
| `DOCKER_MEMORY_LIMIT` | `256m` | Límite de memoria |

## Modelo de Seguridad

### Local Sandbox

**Nivel de Aislamiento:** Proceso (subprocess)

**Uso Previsto:**
- Desarrollo e iteración rápida
- Código confiable del LLM
- Entornos locales controlados

**Lo que Protege:**
- Procesos descontrolados (enforcement timeout)
- Agotamiento de recursos (truncado de salida)
- Contaminación del directorio (directorio temporal)

**Lo que NO Protege:**
- Código malicioso con acceso OS
- **Recomendación:** Usar Docker para código no confiable

### Docker Sandbox

**Nivel de Aislamiento:** Contenedor

**Uso Previsto:**
- Producción
- Código no confiado
- Sistemas multi-usuario

**Lo que Protege:**
- Acceso al filesystem
- Ataques basados en red
- Agotamiento de recursos
- Escalada de privilegios

## Solución de Problemas

### "Docker daemon no disponible"

**Solución:**
```bash
sudo systemctl start docker  # Linux
# o usar Docker Desktop (macOS/Windows)
docker ps  # Verificar
```

### "Permiso denegado en Docker"

**Solución:**
```bash
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

## Referencias

- [Sandbox Spec (Inglés)](../../openspec/changes/2026-01-09-add-sandbox-execution/specs/sandbox/spec.md)
- [Propuesta OpenSpec](../../openspec/changes/2026-01-09-add-sandbox-execution/proposal.md)
