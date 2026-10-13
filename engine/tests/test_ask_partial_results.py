"""Fault-injection tests for the map -> readers -> synthesizer ask path."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from repobrain_engine.hub import ask_pipeline as ask_mod


AUTH_ANSWER = "Authentication checks the token in `auth.py:1-4`."
API_ANSWER = "The API calls authenticate() in `api.py:8-12`."
DB_ANSWER = "Sessions are stored in `db.py:20-24`."


@pytest.fixture
def run_ask(tmp_path, monkeypatch):
    """Use real Agent/tool construction, replacing only the model runner."""
    import agents
    from repobrain_engine import config
    from repobrain_engine.hub import agents as hub_agents

    monkeypatch.setattr(config, "get_settings", lambda: SimpleNamespace(STREAM_ENABLED=False))
    monkeypatch.setattr(hub_agents, "create_model", lambda settings: "test-model")
    monkeypatch.setenv("RB_ASK_RETRY_COUNT", "0")
    monkeypatch.setenv("RB_API_CONCURRENCY", "2")
    prompts = {}
    calls = []

    async def run(outcomes, *, docs=None, router="MODULES: auth, api, db"):
        if docs is None:
            docs = {"auth": "Auth knowledge", "api": "API knowledge", "db": "DB knowledge"}
        rb_dir = tmp_path / ".repobrain"
        rb_dir.mkdir(exist_ok=True)
        (rb_dir / "map.md").write_text("\n".join(docs), encoding="utf-8")
        for name, content in docs.items():
            path = rb_dir / "agents" / f"{name}.md"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")

        async def fake_run(agent, prompt, **kwargs):
            calls.append(agent.name)
            prompts[agent.name] = prompt
            outcome = router if agent.name == "QuickRouter" else outcomes[agent.name]
            if isinstance(outcome, BaseException):
                raise outcome
            return SimpleNamespace(final_output=outcome)

        monkeypatch.setattr(agents.Runner, "run", fake_run)
        return await ask_mod._ask_with_agent_md(tmp_path, "How do auth, API and sessions interact?")

    return SimpleNamespace(run=run, prompts=prompts, calls=calls)


@pytest.mark.asyncio
@pytest.mark.parametrize("synthesis", [RuntimeError("model unavailable"), "", " \n "])
async def test_synthesis_failure_preserves_all_module_findings(run_ask, synthesis):
    answer = await run_ask.run({
        "Reader_auth": AUTH_ANSWER,
        "Reader_api": API_ANSWER,
        "Reader_db": DB_ANSWER,
        "Synthesizer": synthesis,
    })

    assert answer is not None
    for finding in (AUTH_ANSWER, API_ANSWER, DB_ANSWER):
        assert finding in answer
    assert answer.index(AUTH_ANSWER) < answer.index(API_ANSWER) < answer.index(DB_ANSWER)
    assert "synthesis" in answer.lower()
    assert "**From auth:**" in answer
    assert "**From api:**" in answer
    assert "**From db:**" in answer
    assert len(run_ask.calls) == 5  # No extra model call for the fallback.


@pytest.mark.asyncio
@pytest.mark.parametrize("reader", [RuntimeError("private provider diagnostics"), "", " \n "])
async def test_one_surviving_reader_reports_missing_coverage(run_ask, reader):
    answer = await run_ask.run({
        "Reader_auth": AUTH_ANSWER,
        "Reader_api": reader,
        "Reader_db": "(not relevant)",
    })

    assert answer is not None
    assert AUTH_ANSWER in answer
    assert "Partial answer" in answer
    assert "api" in answer.split("\n\n")[0]
    assert "db" not in answer.split("\n\n")[0]
    assert "private provider diagnostics" not in answer
    assert "Synthesizer" not in run_ask.calls


@pytest.mark.asyncio
@pytest.mark.parametrize("synthesis", ["Combined findings.", RuntimeError("synthesis unavailable")])
async def test_failed_reader_is_visible_after_synthesis(run_ask, synthesis):
    answer = await run_ask.run({
        "Reader_auth": AUTH_ANSWER,
        "Reader_api": API_ANSWER,
        "Reader_db": RuntimeError("private provider diagnostics"),
        "Synthesizer": synthesis,
    })

    assert answer is not None
    assert answer.count("Partial answer") == 1
    assert "db" in answer.split("\n\n")[0]
    assert "private provider diagnostics" not in answer
    prompt = run_ask.prompts["Synthesizer"]
    assert AUTH_ANSWER in prompt and API_ANSWER in prompt
    assert "No usable reader response" in prompt
    assert "db" in prompt
    assert "Do not infer their behavior" in prompt
    if isinstance(synthesis, Exception):
        assert AUTH_ANSWER in answer and API_ANSWER in answer
    else:
        assert answer.endswith(synthesis)


@pytest.mark.asyncio
async def test_healthy_synthesis_is_unchanged(run_ask):
    answer = await run_ask.run({
        "Reader_auth": AUTH_ANSWER,
        "Reader_api": API_ANSWER,
        "Reader_db": DB_ANSWER,
        "Synthesizer": "The complete answer.",
    })

    assert answer == "The complete answer."
    prompt = run_ask.prompts["Synthesizer"]
    assert all(finding in prompt for finding in (AUTH_ANSWER, API_ANSWER, DB_ANSWER))
    assert "No usable reader response" not in prompt
    assert len(run_ask.calls) == 5  # Router, three readers, synthesizer.


@pytest.mark.asyncio
async def test_irrelevance_does_not_report_failure(run_ask):
    answer = await run_ask.run({
        "Reader_auth": AUTH_ANSWER,
        "Reader_api": "(not relevant)",
        "Reader_db": " \n (NOT RELEVANT) \n ",
    })

    assert answer == AUTH_ANSWER
    assert "Synthesizer" not in run_ask.calls


@pytest.mark.asyncio
async def test_irrelevance_phrase_inside_findings_is_preserved(run_ask):
    finding = "The UI is (not relevant), but sessions are stored in `db.py:20-24`."
    answer = await run_ask.run({
        "Reader_auth": AUTH_ANSWER,
        "Reader_api": "(not relevant)",
        "Reader_db": finding,
        "Synthesizer": RuntimeError("unavailable"),
    })

    assert AUTH_ANSWER in answer and finding in answer
    assert "Partial answer" not in answer
    assert "**From api:**" not in answer


@pytest.mark.asyncio
async def test_no_usable_findings_preserves_legacy_fallback(run_ask):
    answer = await run_ask.run({
        "Reader_auth": RuntimeError("unavailable"),
        "Reader_api": " \n ",
        "Reader_db": "(not relevant)",
    })

    assert answer is None
    assert "Synthesizer" not in run_ask.calls


@pytest.mark.asyncio
async def test_group_attribution_and_refresh_warning_survive_fallback(run_ask):
    from repobrain_engine.hub._constants import AGENT_MD_FALLBACK_MARKER

    answer = await run_ask.run(
        {
            "Reader_auth/token": AUTH_ANSWER,
            "Reader_auth/session": RuntimeError("unavailable"),
            "Reader_api": API_ANSWER,
            "Synthesizer": RuntimeError("unavailable"),
        },
        docs={
            "auth/token": AGENT_MD_FALLBACK_MARKER,
            "auth/session": "Session knowledge",
            "api": "API knowledge",
        },
        router="MODULES: auth, api",
    )

    assert "Incomplete knowledge for module(s): auth/token" in answer
    assert "Partial answer" in answer and "auth/session" in answer
    assert "**From auth/token:**" in answer
    assert AUTH_ANSWER in answer and API_ANSWER in answer
