@echo off
REM SessionStart hook (Windows). Mirrors install_engine.sh.
setlocal

set "PLUGIN_ROOT=%CLAUDE_PLUGIN_ROOT%"
if "%PLUGIN_ROOT%"=="" set "PLUGIN_ROOT=%~dp0.."

where ag-mcp >nul 2>&1
if not errorlevel 1 exit /b 0

echo [antigravity] ag-mcp not found. Attempting auto-install... 1>&2

where pipx >nul 2>&1
if not errorlevel 1 (
    pipx install "%PLUGIN_ROOT%\engine" 1>&2 2>&1
    where ag-mcp >nul 2>&1
    if not errorlevel 1 exit /b 0
)

where python >nul 2>&1
if not errorlevel 1 (
    python -m pip install --user --quiet "%PLUGIN_ROOT%\engine" "%PLUGIN_ROOT%\cli" 1>&2 2>&1
    where ag-mcp >nul 2>&1
    if not errorlevel 1 exit /b 0
)

echo [antigravity] AUTO-INSTALL FAILED. Run manually: 1>&2
echo   pipx install "%PLUGIN_ROOT%\engine" 1>&2
echo   - or - 1>&2
echo   python -m pip install --user "%PLUGIN_ROOT%\engine" "%PLUGIN_ROOT%\cli" 1>&2
exit /b 1
