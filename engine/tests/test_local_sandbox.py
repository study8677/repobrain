import os

from antigravity_engine.sandbox.local import LocalSandbox


def test_success_execution():
    s = LocalSandbox()
    r = s.execute("print('Hello')")
    assert r.exit_code == 0
    assert "Hello" in r.stdout
    assert r.meta.get("runtime") == "local"


def test_timeout_enforcement(monkeypatch):
    s = LocalSandbox()
    r = s.execute("\nwhile True:\n    pass\n", timeout=1)
    assert r.exit_code == -1
    assert "timed out" in r.stderr.lower()


def test_non_zero_exit_code():
    s = LocalSandbox()
    r = s.execute("raise ValueError('x')", timeout=5)
    assert r.exit_code != 0
    assert "ValueError" in r.stderr
    # Duration should be measured
    assert isinstance(r.duration, float)
    assert r.duration >= 0


def test_output_truncation(monkeypatch):
    monkeypatch.setenv("SANDBOX_MAX_OUTPUT_KB", "1")
    s = LocalSandbox()
    r = s.execute("print('X' * 50000)", timeout=5)
    assert r.meta.get("truncated") is True
    assert "output truncated" in r.stdout


def test_stderr_capture():
    s = LocalSandbox()
    r = s.execute("import sys\nsys.stderr.write('ERR')")
    assert r.exit_code == 0
    assert "ERR" in r.stderr


def test_working_dir_isolation():
    # Ensure that creating files happens in a temp dir, not project root
    filename = "test.txt"
    try:
        if os.path.exists(filename):
            os.remove(filename)
        s = LocalSandbox()
        r = s.execute(
            "with open('test.txt','w') as f:\n    f.write('data')\nprint('done')",
            timeout=5,
        )
        assert r.exit_code == 0
        assert "done" in r.stdout
        # File should NOT exist in project root since sandbox uses temp cwd
        assert not os.path.exists(filename)
    finally:
        if os.path.exists(filename):
            os.remove(filename)
