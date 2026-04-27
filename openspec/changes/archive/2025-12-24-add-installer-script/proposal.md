# Change: Add Installer Scripts

## Why
Currently, users have to manually clone the repository, install Python dependencies, and set up the environment variables. This creates friction for new users and potential setup errors. An automated installer script will simplify the onboarding process across Linux, Mac, and Windows.

## What Changes
- Add a cross-platform installer script (or separate scripts for POSIX/Windows) to:
    - Check system prerequisites (Python, Git).
    - Set up a virtual environment.
    - Install dependencies from `requirements.txt`.
    - Initialize configuration (copy example `.env`, setup `.cursorrules`).
    - Provide a simple command to start the agent.
- Update `README.md` with installation instructions using the new script.

## Impact
- **Affected specs:** `deployment` (new capability)
- **Affected code:** New `scripts/` or root directory files, `README.md`.
