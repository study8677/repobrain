@echo off
REM Antigravity Workspace Template Installer for Windows
REM This script sets up the development environment automatically

setlocal enabledelayedexpansion

echo.
echo 🪐 Antigravity Workspace Template - Installer
echo =============================================
echo.

REM Check if Python 3 is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Python is not installed.
    echo Please install Python 3.8 or higher from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

REM Check Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ Python !PYTHON_VERSION! detected

REM Check if Git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Git is not installed.
    echo Please install Git from https://git-scm.com/downloads
    pause
    exit /b 1
)

for /f "tokens=3" %%i in ('git --version') do set GIT_VERSION=%%i
echo ✅ Git !GIT_VERSION! detected
echo.

REM Create virtual environment
echo 📦 Creating virtual environment...
if exist "venv\" (
    echo ⚠️  Virtual environment already exists. Skipping creation.
) else (
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Error: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo ✅ Virtual environment created
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ Error: Failed to activate virtual environment.
    pause
    exit /b 1
)

REM Upgrade pip
echo 📦 Upgrading pip...
python -m pip install --upgrade pip --quiet
if errorlevel 1 (
    echo ⚠️  Warning: pip upgrade had issues, continuing...
)

REM Install dependencies
echo 📦 Installing dependencies...
pip install -e . --quiet
if errorlevel 1 (
    echo ❌ Error: Failed to install dependencies.
    pause
    exit /b 1
)
echo ✅ Dependencies installed

REM Ensure correct Google GenAI package is installed (avoid deprecated package)
python -m pip show google-generativeai >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  Detected deprecated google-generativeai package. Removing...
    python -m pip uninstall -y google-generativeai --quiet
)

python -m pip show google-genai >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing google-genai (required for from google import genai)...
    python -m pip install google-genai --quiet
)

REM Initialize configuration
echo 🔧 Setting up configuration...

REM Create .env if it doesn't exist
if not exist ".env" (
    (
        echo # Antigravity Workspace Configuration
        echo # Copy this file and configure your API keys
        echo.
        echo # Google Gemini API Key (Required)
        echo GOOGLE_API_KEY=your_api_key_here
        echo.
        echo # Optional: OpenAI API Key for alternative LLM
        echo # OPENAI_API_KEY=your_openai_key_here
        echo.
        echo # Optional: Model Configuration
        echo # MODEL_NAME=gemini-2.0-flash-exp
    ) > .env
    echo ✅ Created .env file (please configure your API keys)
) else (
    echo ⚠️  .env file already exists. Skipping creation.
)

REM Create artifacts directory if it doesn't exist
if not exist "artifacts\" (
    mkdir artifacts
    echo ✅ Created artifacts directory
)

echo.
echo =============================================
echo ✅ Installation complete!
echo.
echo Next steps:
echo 1. Configure your API keys in .env file:
echo    notepad .env
echo.
echo 2. The virtual environment is already activated.
echo.
echo 3. Run the agent:
echo    python agent.py
echo.
echo 📚 Documentation: docs/en/QUICK_START.md
echo =============================================
echo.
pause
