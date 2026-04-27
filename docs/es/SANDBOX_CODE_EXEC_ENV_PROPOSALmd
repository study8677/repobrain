---
title: "Propuesta de Arquitectura: Abstracción de Entorno de Ejecución (Sandbox)"
status: "RFC (Request for Comments)"
date: "2025-12-25"
context: "Issue #9 — Sandbox Environment Dilemma"
owners:
    - "(Completar)"
---

# Propuesta de Arquitectura: Abstracción de Entorno de Ejecución (Sandbox)

> Nota: Este documento es una propuesta técnica (no implementación). Para llevarlo a código en este repo, lo ideal es formalizarlo como un cambio OpenSpec (nuevo capability o extensión a `deployment`/`security`), siguiendo `openspec/AGENTS.md`.

## Índice

- [1. Resumen ejecutivo](#1-resumen-ejecutivo)
- [2. Problema y contexto](#2-problema-y-contexto)
- [3. Decisión clave](#3-decisión-clave)
- [4. Objetivos y no-objetivos](#4-objetivos-y-no-objetivos)
- [5. Arquitectura conceptual](#5-arquitectura-conceptual)
    - [5.1. Diagrama de clases (Strategy + Factory)](#51-diagrama-de-clases-strategy--factory)
    - [5.2. Flujo de ejecución](#52-flujo-de-ejecución)
- [6. Especificación técnica](#6-especificación-técnica)
    - [6.1. Estructura de directorios propuesta](#61-estructura-de-directorios-propuesta)
    - [6.2. Contratos de datos](#62-contratos-de-datos)
    - [6.3. Interfaz (Protocol)](#63-interfaz-protocol)
    - [6.4. Implementación default: LocalSandbox](#64-implementacion-default-localsandbox)
    - [6.5. Factory: resolución por configuración](#65-factory-resolución-por-configuración)
    - [6.6. Implementación opt-in: DockerSandbox](#66-implementacion-opt-in-dockersandbox)
    - [6.7. Implementación futura: Cloud/E2B](#67-implementacion-futura-cloude2b)
- [7. Integración con el agente (alineación con el repo)](#7-integración-con-el-agente-alineación-con-el-repo)
- [8. Modelo de seguridad](#8-modelo-de-seguridad)
    - [8.1. Riesgos por modo](#81-riesgos-por-modo)
    - [8.2. Mitigaciones mínimas para LocalSandbox (MVP)](#82-mitigaciones-minimas-para-localsandbox-mvp)
    - [8.3. Controles recomendados para DockerSandbox](#83-controles-recomendados-para-dockersandbox)
- [9. Observabilidad y auditoría](#9-observabilidad-y-auditoria)
- [10. Plan de implementación (por fases)](#10-plan-de-implementación-por-fases)

---

## 1. Resumen ejecutivo

Actualmente existe tensión entre:

- La necesidad de ejecutar código de forma **más segura** (sandboxing / aislamiento).
- La filosofía **Zero-Config** del template (bajar fricción: “clone and go”).

Forzar Docker como dependencia predeterminada rompe la experiencia inicial (instalación del daemon, permisos, pull de imágenes, etc.).

Esta propuesta sugiere rechazar la dicotomía "Docker sí/no" e implementar en su lugar una arquitectura basada en interfaces (Factory Pattern). Esto permite que el motor de ejecución sea agnóstico para el Agente, delegando la implementación concreta (Local, Docker, E2B) a una configuración de entorno.

## 2. Problema y contexto

Este repositorio hoy:

- Descubre tools localmente desde `antigravity_engine/tools/*.py` (carga dinámica).
- Puede integrar MCP como herramientas externas.
- No incluye un "sandbox" formal: la ejecución de código potencialmente no confiable es un vacío (Issue #9).

La propuesta busca introducir una **abstracción de ejecución** para que:

- El agente/las tools no sepan “dónde” se ejecuta el código.
- El usuario elija el nivel de aislamiento (local rápido vs docker seguro).

## 3. Decisión clave

**Default = LocalSandbox (subprocess)**, preservando Zero-Config.

**DockerSandbox = opt-in** para aislamiento fuerte.

Esto evita la dicotomía “Docker sí/no”: se provee una interfaz única y un factory que decide.

## 4. Objetivos y no-objetivos

**Objetivos**

- Proveer una interfaz estable `CodeSandbox.execute(...)` con resultados tipados.
- Permitir elegir runtime por configuración (`SANDBOX_TYPE`) sin tocar el código.
- Mantener el camino “clone → run” (sin dependencias obligatorias adicionales).
- Soportar timeouts y captura de stdout/stderr de forma consistente.

**No-objetivos (por ahora)**

- No implementar un RCE “a prueba de todo” en modo local (eso requiere sandbox del OS).
- No diseñar un scheduler multi-tenant.
- No ejecutar lenguajes arbitrarios sin una política explícita (allowlist).

---

## 5. Arquitectura conceptual

El diseño desacopla la intención de ejecutar código de la infraestructura necesaria para hacerlo.

### 5.1. Diagrama de clases (Strategy + Factory)

```mermaid
classDiagram
    namespace Core {
        class SandboxProtocol {
            <<Interface>>
            +execute(code: str, language: str) ExecutionResult
        }
        class SandboxFactory {
            +get_sandbox() SandboxProtocol
        }
    }

    namespace Implementations {
        class LocalSandbox {
            +execute()
        }
        class DockerSandbox {
            +execute()
        }
        class CloudSandbox {
            +execute()
        }
    }

    class Agent {
        -tools
    }

    Agent ..> SandboxFactory : Solicita instancia
    SandboxFactory --> LocalSandbox : Crea (Default)
    SandboxFactory --> DockerSandbox : Crea (Si ENV=docker)
    LocalSandbox ..|> SandboxProtocol : Implementa
    DockerSandbox ..|> SandboxProtocol : Implementa
    CloudSandbox ..|> SandboxProtocol : Implementa (Futuro/E2B)

```


### 5.2. Flujo de ejecución

```mermaid
sequenceDiagram
    participant User
    participant Agent
    participant Tool as CodeExecutionTool
    participant Factory as SandboxFactory
    participant Env as .env Config
    participant Runtime as Local/Docker

    User->>Agent: "Genera y ejecuta un script de Python"
    Agent->>Agent: Genera código
    Agent->>Tool: call(code="print('hi')")
    
    rect rgb(240, 248, 255)
    Note over Tool, Env: Resolución Dinámica
    Tool->>Factory: get_sandbox()
    Factory->>Env: Leer SANDBOX_TYPE
    Env-->>Factory: "local" (default)
    Factory-->>Tool: Retorna instancia LocalSandbox
    end

    Tool->>Runtime: execute(code)
    Runtime-->>Tool: Stdout: "hi"
    Tool-->>Agent: Resultado
    Agent-->>User: Respuesta Final

```


## 6. Especificación técnica

### 6.1. Estructura de directorios propuesta

Se propone añadir un módulo dedicado para aislar la lógica de ejecución:

```text
antigravity_engine/
├── sandbox/              # NUEVO MÓDULO
│   ├── __init__.py
│   ├── base.py           # Definición del Protocolo (Interfaz)
│   ├── factory.py        # Lógica de instanciación
│   ├── local.py          # Implementación venv/subprocess
│   └── docker_exec.py    # Implementación Docker SDK
├── tools/
│   └── execution_tool.py # Tool expuesta al Agente (Consumer)

```

### 6.2. Contratos de datos

El objetivo es que el *runtime* (local/docker/cloud) siempre devuelva un resultado estructurado.

- `stdout`: salida estándar
- `stderr`: error estándar
- `exit_code`: código de salida
- `duration`: duración en segundos
- (recomendado) `truncated`: si se recortó output por tamaño
- (recomendado) `timed_out`: boolean
- (recomendado) `meta`: diccionario con detalles (runtime, versión, límites)


### 6.3. Interfaz (Protocol)

Usamos typing.Protocol para un tipado estructural estricto sin necesidad de herencia compleja.

```python
from typing import Protocol
from dataclasses import dataclass

@dataclass
class ExecutionResult:
    stdout: str
    stderr: str
    exit_code: int
    duration: float

class CodeSandbox(Protocol):
    """Interfaz abstracta para cualquier entorno de ejecución."""
    
    def execute(
        self, 
        code: str, 
        language: str = "python", 
        timeout: int = 30
    ) -> ExecutionResult:
        """
        Ejecuta el código proporcionado de manera síncrona.
        Debe manejar Timeouts y capturar Stdout/Stderr.
        """
        ...
```


### 6.4. Implementación default: LocalSandbox

Esta es la clave para mantener la filosofía Zero-Config. Usa el mismo entorno virtual donde corre el agente.

```python
import subprocess
import sys
import time
from .base import CodeSandbox, ExecutionResult

class LocalSandbox(CodeSandbox):
    def execute(self, code: str, language: str = "python", timeout: int = 30) -> ExecutionResult:
        start_time = time.time()
        try:
            # Ejecuta en un subproceso aislado usando el mismo intérprete
            process = subprocess.run(
                [sys.executable, "-c", code],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return ExecutionResult(
                stdout=process.stdout,
                stderr=process.stderr,
                exit_code=process.returncode,
                duration=time.time() - start_time
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult("", "Execution timed out", -1, timeout)

```

Recomendación: en lugar de `python -c <code>` (que dificulta auditoría y límites), usar un archivo temporal bajo un directorio controlado y ejecutar `python <tmpfile>`.


### 6.5. Factory: resolución por configuración

Controlada puramente por variables de entorno, permitiendo cambiar el comportamiento sin tocar el código.

```python
import os
from .base import CodeSandbox
from .local import LocalSandbox

def get_sandbox() -> CodeSandbox:
    """Factory Method para obtener el ejecutor configurado."""
    mode = os.getenv("SANDBOX_TYPE", "local").lower()
    
    if mode == "docker":
        # Importación lazy para no requerir docker-py si no se usa
        from .docker_exec import DockerSandbox 
        return DockerSandbox()
        
    elif mode == "e2b":
        # Soporte futuro para Cloud Sandbox (Fase 9 Roadmap)
        from .e2b_exec import E2BSandbox
        return E2BSandbox()
        
    return LocalSandbox()

```

Recomendación: soportar `SANDBOX_TYPE=local|docker|e2b` y `SANDBOX_TIMEOUT_SEC` como override global.


### 6.6. Implementación opt-in: DockerSandbox

**Objetivo:** aislamiento fuerte (filesystem, permisos, red) manteniendo la misma interfaz.

En este repo ya existe Docker para ejecutar el agente (`Dockerfile`, `docker-compose.yml`). Para sandbox de ejecución, DockerSandbox debe:

- Ejecutar el código en un contenedor “runner” dedicado (no necesariamente el contenedor del agente).
- Montar un directorio temporal read-only cuando aplique.
- Limitar recursos (CPU/mem), tiempo, y opcionalmente red.

**Nota de dependencias:** la propuesta sugiere importación lazy (`docker-py` solo si se usa) para mantener Zero-Config.

### 6.7. Implementación futura: Cloud/E2B

**Objetivo:** ejecutar en un entorno remoto (más seguro por aislamiento fuera del host) usando la misma interfaz.

- Es ideal para enterprise/multi-tenant.
- Debe incluir autenticación, cuotas y auditoría.

---

## 7. Integración con el agente (alineación con el repo)

El Agente no necesita saber qué sandbox está usando. Solo necesita una "Tool" que actúe como puente.

Este repo expone herramientas al agente via `antigravity_engine/tools/*.py` (carga dinámica). Por tanto, la integración ideal es una tool simple, p.ej. `antigravity_engine/tools/execution_tool.py`, que:

1) Reciba código + lenguaje
2) Use `get_sandbox()`
3) Devuelva stdout/stderr de forma segura y truncada

Ejemplo:

```python
from antigravity_engine.sandbox.factory import get_sandbox


def run_python_code(code: str, timeout: int = 30) -> str:
    """Ejecuta código Python usando el sandbox configurado.

    Nota: en este repo, las tools son funciones públicas en `antigravity_engine/tools/*.py`.
    El agente ejecuta como máximo una tool por iteración, así que el output
    debe ser compacto (p.ej. truncado) y autocontenido.
    """
    sandbox = get_sandbox()
    result = sandbox.execute(code=code, language="python", timeout=timeout)

    if result.exit_code != 0:
        return f"Error (exit_code={result.exit_code}): {result.stderr}"

    return result.stdout

```

**Alineación con `antigravity_engine/agent.py`:**

- El agente actualmente ejecuta como máximo **una tool** por iteración y luego hace un follow-up.
- Por tanto, la tool debe devolver un output compacto y confiable (incluyendo errores bien formateados).

---

## 8. Modelo de seguridad

La seguridad depende del modo. Esta sección propone un “escalado progresivo” sin romper Zero-Config.

### 8.1. Riesgos por modo

**LocalSandbox (default)**
- Riesgo: el código ejecuta en el host del usuario con permisos del proceso del agente.
- Impacto: filesystem, red, consumo de recursos.

**DockerSandbox (opt-in)**
- Riesgo: escape del contenedor (bajo, pero no cero), mala configuración de mounts/caps.
- Impacto: depende del hardening.

### 8.2. Mitigaciones mínimas para LocalSandbox (MVP)

Sin romper UX, se recomiendan controles “ligeros”:

- **Timeout estricto** (ya contemplado) y kill del subproceso.
- **Límites de output**: truncar stdout/stderr a N KB para evitar spam.
- **Bloqueo por heurística** (opcional, configurable):
    - parseo AST para bloquear imports evidentes (`os`, `subprocess`, `shutil`, `pathlib`, `socket`) o calls peligrosas.
    - esto no es seguridad perfecta, pero reduce accidentes.
- **Working directory aislado**: ejecutar en un temp dir dedicado.

### 8.3. Controles recomendados para DockerSandbox

- `--network=none` por defecto (si el caso de uso lo permite)
- limitar CPU/mem (`--cpus`, `--memory`)
- filesystem read-only y mounts mínimos
- drop capabilities, no privileged

---

## 9. Observabilidad y auditoría

Propuesta mínima:

- Cada ejecución retorna `ExecutionResult` + meta (duración, runtime, límites).
- La tool puede serializar un resumen para persistencia (ej. en `agent_memory.json` ya se guarda como mensaje `tool`).
- Para auditoría avanzada: emitir un artifact con el código ejecutado + resultado, siempre que la política del entorno lo permita.

---

## 10. Plan de implementación (por fases)

**Fase 1 (MVP, Zero-Config):**

- [ ] Crear `antigravity_engine/sandbox/` y contratos base.
- [ ] Implementar `LocalSandbox` con subprocess + timeout + truncado de output.
- [ ] Implementar `SandboxFactory` leyendo `SANDBOX_TYPE`.
- [ ] Exponer tool `antigravity_engine/tools/execution_tool.py` (p.ej. `run_python_code`).
- [ ] Añadir tests mínimos para: timeout, exit_code != 0, output truncation.

**Fase 2 (opt-in Docker):**

- [ ] Implementar `DockerSandbox` con hardening básico.
- [ ] Documentar requisitos (docker daemon) como opt-in.

**Fase 3 (cloud sandbox):**

- [ ] Definir interfaz de credenciales, cuotas y auditoría.
- [ ] Integrar E2B/K8s/otro proveedor.

---

## Apéndice: Impacto (Pros/Cons)


### Ventajas (Pros)

Cero Fricción Inicial: git clone funciona inmediatamente. No se requiere docker pull ni configuración de demonios para empezar.

Extensible: Permite añadir E2BSandbox o KubernetesSandbox en el futuro (Fase 9 del Roadmap) sin refactorizar el agente.

DX Superior: Para tareas sencillas (testear una función, cálculo matemático), la ejecución local es milisegundos más rápida que levantar un contenedor.

Seguridad Progresiva: Los usuarios empresariales pueden activar SANDBOX_TYPE=docker en su CI/CD o entorno de producción sin cambiar la lógica del agente.

### Desventajas (Cons)

Riesgo Local: En el modo por defecto (local), un script malicioso generado por la IA podría afectar el host (ej. rm -rf).

Mitigación: Añadir un análisis estático simple (AST) en LocalSandbox para bloquear imports peligrosos (os, shutil) o advertir al usuario.

Complejidad de Código: Añade una capa de abstracción extra vs simplemente ejecutar exec().

## Conclusión y siguientes pasos

Esta arquitectura resuelve el conflicto del Issue original al no casarse con una única tecnología: crea una interfaz estable y deja que la elección de aislamiento sea una decisión de configuración.

Siguiente paso recomendado en este repo: formalizar un **cambio OpenSpec** (`add-sandbox-execution` o similar) con:

- `proposal.md` (Why/What/Impact)
- `tasks.md` (checklist)
- spec delta para una capability nueva, p.ej. `openspec/changes/<id>/specs/sandbox/spec.md` con escenarios:
    - Local default
    - Docker opt-in
    - Missing Docker error path
    - Timeout behavior
