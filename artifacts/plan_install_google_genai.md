# Plan: Ensure google-genai is installed by installers

## Goal
Update install scripts to explicitly ensure the correct Google GenAI SDK is installed so Windows users do not hit `ModuleNotFoundError: No module named 'google'`.

## Steps
1. Review current install scripts and dependency list.
2. Add a post-install check to uninstall `google-generativeai` if present and install/verify `google-genai`.
3. Keep messages user-friendly and non-failing if the old package is absent.
4. Verify scripts remain consistent across Linux/macOS and Windows.

## Files
- install.sh
- install.bat

## Notes
- No code changes in src/ required.
