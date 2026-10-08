# Referencia de uso de RepoBrain

La instalación, configuración del backend y plantillas de CLI locales (incluido Trae) están en [INSTALL.md](../../INSTALL.md). Esta página describe los comandos después de instalar.

## Actualizar y preguntar

Ejecuta estos comandos en la raíz del proyecto:

```bash
rb-refresh
rb-ask "¿Cómo funciona la autenticación?"
```

`rb-refresh` elige automáticamente entre la primera construcción completa, una actualización incremental o la continuación de una tarea incompleta compatible con la versión actual. Si la base ya está actualizada, omite la generación. Después de un fallo, ejecuta el mismo comando de nuevo. Para iniciar explícitamente una reconstrucción completa:

```bash
rb-refresh --full
```

La actualización utiliza código confirmado en Git y exige un árbol de trabajo limpio. La primera construcción puede tardar varios minutos o más en repositorios grandes. Si falla, la base publicada anteriormente sigue disponible. `rb-ask` avisa cuando el conocimiento queda atrás del commit actual; preguntar nunca actualiza la base.

`--workspace` indica el directorio del proyecto y por defecto usa el directorio actual (`.`). Especifica una ruta si ejecutas desde otro lugar:

```bash
rb-refresh --workspace /path/to/project
rb-ask "¿Dónde están las pruebas?" --workspace /path/to/project
```

El paquete Engine proporciona `rb-refresh`, `rb-ask` y `rb-mcp`. El paquete CLI proporciona inyección de plantillas, diagnóstico y notas sin modelo. Con ambos paquetes instalados, `rb refresh` y `rb ask` delegan al mismo Engine y aceptan las opciones `--full`, `--json` y `--workspace` correspondientes a cada comando. Consulta [INSTALL.md](../../INSTALL.md).

## Llamadas desde scripts u otros agentes

Usa JSON cuando el consumidor pueda ejecutar comandos shell:

```bash
rb-ask "¿Cómo funciona la autenticación?" --workspace /path/to/project --json
```

Una llamada exitosa escribe este objeto en stdout y termina con código `0`:

```json
{
  "answer": "La autenticación está en src/auth.py …",
  "sources": ["src/auth.py:12"],
  "limitations": [],
  "workspace": "/path/to/project",
  "question": "¿Cómo funciona la autenticación?"
}
```

Si falla la ejecución de la consulta, stdout queda vacío, stderr recibe `{"error": "..."}` y el código de salida es distinto de cero. El analizador rechaza argumentos inválidos; una interrupción termina con código `130`. El comando equivalente es `rb ask "pregunta" --json`.

## Comandos slash del plugin

Estos comandos se ejecutan dentro del host con el plugin instalado; no son ejecutables shell:

| Propósito | Claude Code | Codex CLI |
|---|---|---|
| Configurar el backend | `/repobrain:rb-setup` | `/rb-setup` |
| Actualizar automáticamente | `/repobrain:rb-refresh` | `/rb-refresh` |
| Reconstruir por completo | `/repobrain:rb-refresh --full` | `/rb-refresh --full` |
| Consultar el proyecto | `/repobrain:rb-ask <pregunta>` | `/rb-ask <pregunta>` |
| Crear un repositorio desde la plantilla | `/repobrain:rb-init <nombre>` | `/rb-init <nombre>` |

Setup solo es necesario cuando el backend no está configurado. No existe un ejecutable shell independiente `rb-setup`; configura `.env` siguiendo [INSTALL.md](../../INSTALL.md) si usas el shell directamente.

## Archivos de instrucciones y notas opcionales

`rb init` inyecta instrucciones compartidas y archivos de arranque para IDEs en un directorio. Es opcional: la actualización crea su propio directorio de conocimiento sin este paso.

```bash
rb init /path/to/project
rb init /path/to/project --force
```

El primer comando omite archivos existentes; `--force` los sobrescribe. Revisa los archivos generados antes de confirmarlos. `AGENTS.md` contiene las reglas compartidas y los archivos específicos de cada IDE remiten a ellas.

El comando slash `rb-init` tiene otra función: invoca la skill `agent-repo-init` para crear un repositorio nuevo desde la plantilla de RepoBrain. No es un requisito para actualizar un proyecto existente. Consulta [Características Zero-Config](ZERO_CONFIG.md).

También puedes registrar hallazgos y decisiones sin llamar a un modelo:

```bash
rb report "El módulo de autenticación necesita refactoring"
rb log-decision "Usar PostgreSQL" "El equipo tiene experiencia operativa"
```

Los hallazgos se escriben en `.repobrain/memory/reports.md` y las decisiones en `.repobrain/decisions/log.md`. Ambos comandos aceptan `--workspace /path/to/project`.

## Diagnóstico

```bash
rb doctor --workspace /path/to/project
```

Doctor comprueba la disponibilidad del Engine, configuración, conectividad del proveedor, estado del conocimiento y ubicación de logs. No genera conocimiento. Su cobertura para runners locales generic es limitada; comprueba también el login y la configuración del propio CLI. Consulta [Troubleshooting (inglés)](../en/TROUBLESHOOTING.md) para problemas de instalación y sesión.

## Exponer RepoBrain como servidor MCP

Usa esta opción con clientes que consumen herramientas MCP. Construye la base y registra el servidor stdio, por ejemplo en Claude Code:

```bash
rb-refresh --workspace /path/to/project
claude mcp add repobrain rb-mcp -- --workspace /path/to/project
```

Otros clientes pueden usar el [ejemplo de configuración MCP](../examples/repobrain.mcp.json), cambiando la ruta del proyecto y asegurando que `rb-mcp` esté en su PATH. El servidor expone `ask_project(question)` y `refresh_project(full=False)`. Preguntar es de solo lectura; actualizar modifica el conocimiento y `full=True` inicia una reconstrucción completa.

Esta integración como servidor es distinta de RepoBrain consumiendo servidores MCP externos, como bases de datos o GitHub. Consulta [Integración MCP](MCP_INTEGRATION.md) para herramientas externas, [Sandbox](SANDBOX.md) para límites de ejecución y [Protocolo Swarm](SWARM_PROTOCOL.md) para el funcionamiento interno.
