"""Shared constants for the Hub package.

Centralises directory-skip lists, language maps, and file-type
classifications that were previously duplicated across scanner,
ask_tools, and pipeline modules.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# Directories to skip during scanning / searching / listing
# ---------------------------------------------------------------------------

SKIP_DIRS: frozenset[str] = frozenset({
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".tox",
    ".mypy_cache",
    ".pytest_cache",
    "dist",
    "build",
    ".eggs",
    ".next",
    ".nuxt",
    "target",
    "vendor",
})
"""Superset of all previously duplicated ``_SKIP_DIRS`` definitions.

Used by scanner, ask_tools, and pipeline for consistent filtering.
Individual modules may extend this set (e.g. ``detect_modules`` adds
``.antigravity``, ``artifacts``, etc.) but should never redefine it.
"""

# ---------------------------------------------------------------------------
# File extension → language name mapping
# ---------------------------------------------------------------------------

LANG_MAP: dict[str, str] = {
    ".py": "Python",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".jsx": "JavaScript (React)",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".kt": "Kotlin",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".cpp": "C++",
    ".c": "C",
    ".swift": "Swift",
    ".dart": "Dart",
    ".lua": "Lua",
    ".sh": "Shell",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".toml": "TOML",
    ".json": "JSON",
    ".md": "Markdown",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sql": "SQL",
}

# ---------------------------------------------------------------------------
# File-type classification sets
# ---------------------------------------------------------------------------

DOCUMENTATION_EXTS: frozenset[str] = frozenset({
    ".md", ".rst", ".txt", ".adoc", ".pdf",
})

DATA_EXTS: frozenset[str] = frozenset({
    ".csv", ".tsv", ".json", ".jsonl", ".yaml", ".yml",
    ".xml", ".sql", ".db", ".sqlite", ".parquet",
})

MEDIA_EXTS: frozenset[str] = frozenset({
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    ".mp3", ".wav", ".ogg", ".mp4", ".mov", ".avi", ".mkv",
})

TEXT_EXTS: frozenset[str] = frozenset(LANG_MAP) | DOCUMENTATION_EXTS | DATA_EXTS | frozenset({".env", ".log"})

# ---------------------------------------------------------------------------
# Source code module analysis
# ---------------------------------------------------------------------------

SOURCE_CODE_EXTS: frozenset[str] = frozenset({
    ".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".java", ".kt",
    ".rb", ".php", ".cs", ".cpp", ".c", ".h", ".hpp", ".swift", ".dart",
    ".lua", ".sh", ".scala", ".zig", ".ex", ".exs", ".clj", ".hs",
})
"""File extensions treated as analyzable source code for module discovery."""

WORKSPACE_ROOT_MODULE_ID = "__workspace_root__"
"""Internal module identifier used for source files that live at repo root."""

# ---------------------------------------------------------------------------
# Framework / tool marker files
# ---------------------------------------------------------------------------

FRAMEWORK_MARKERS: dict[str, str] = {
    "pyproject.toml": "Python (pyproject.toml)",
    "setup.py": "Python (setup.py)",
    "requirements.txt": "Python (requirements.txt)",
    "package.json": "Node.js",
    "Cargo.toml": "Rust (Cargo)",
    "go.mod": "Go Modules",
    "Gemfile": "Ruby (Bundler)",
    "pom.xml": "Java (Maven)",
    "build.gradle": "Java/Kotlin (Gradle)",
    "composer.json": "PHP (Composer)",
    "pubspec.yaml": "Dart/Flutter",
    "Makefile": "Make",
    "CMakeLists.txt": "CMake",
    "Dockerfile": "Docker",
    "docker-compose.yml": "Docker Compose",
    "docker-compose.yaml": "Docker Compose",
    ".github/workflows": "GitHub Actions",
    "Jenkinsfile": "Jenkins",
    ".gitlab-ci.yml": "GitLab CI",
    "tsconfig.json": "TypeScript",
    "next.config.js": "Next.js",
    "next.config.mjs": "Next.js",
    "vite.config.ts": "Vite",
    "webpack.config.js": "Webpack",
    "tailwind.config.js": "Tailwind CSS",
    ".eslintrc.js": "ESLint",
    ".prettierrc": "Prettier",
    "pytest.ini": "Pytest",
    "setup.cfg": "Python (setup.cfg)",
    "tox.ini": "Tox",
}
