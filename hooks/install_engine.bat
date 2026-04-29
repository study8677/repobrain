@echo off
REM Thin wrapper for manual invocation on Windows. Real install logic lives
REM in install_engine.py so the Unix .sh wrapper and this share one source.
setlocal
where python >nul 2>&1
if not errorlevel 1 (
    python "%~dp0install_engine.py"
    exit /b %errorlevel%
)
where py >nul 2>&1
if not errorlevel 1 (
    py "%~dp0install_engine.py"
    exit /b %errorlevel%
)
echo [antigravity] Python is required but neither 'python' nor 'py' was found on PATH. 1>&2
echo Install Python 3.10+ from https://www.python.org/downloads/ and re-run. 1>&2
exit /b 1
