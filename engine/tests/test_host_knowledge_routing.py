"""Host knowledge selection follows model decisions, independent of query language."""
import json
from types import SimpleNamespace

import pytest

from repobrain_engine.hub.ask_pipeline import _build_host_runner_agent_context


@pytest.fixture
def knowledge(tmp_path):
    root = tmp_path / '.repobrain'
    docs = root / 'agents'
    (docs / 'security').mkdir(parents=True)
    (root / 'map.md').write_text('security: authentication; audit: event history')
    (docs / 'aaa.md').write_text('UNRELATED FIRST DOCUMENT')
    (docs / 'audit.md').write_text('AUDIT KNOWLEDGE')
    (docs / 'security' / 'auth.md').write_text('AUTH KNOWLEDGE')
    return tmp_path


@pytest.fixture
def settings():
    return SimpleNamespace(RB_HOST_RUNNER='generic', RB_HOST_MODEL='model',
                           RB_HOST_COMMAND='host {prompt_file}',
                           RB_HOST_OUTPUT_MODE='file', RB_HOST_TIMEOUT_SECONDS=30)


@pytest.mark.asyncio
@pytest.mark.parametrize('question', ['用户登录后如何检查权限？', 'How are permissions checked?',
                                     'AuthService 如何记录审计日志？'])
async def test_model_selects_cross_language_and_nested_documents(knowledge, settings, monkeypatch, question):
    def route(**kwargs):
        assert question in kwargs['prompt']
        assert 'security/auth.md' in kwargs['prompt']
        assert 'authentication' in kwargs['prompt']
        assert kwargs['command'] == settings.RB_HOST_COMMAND
        assert kwargs['timeout_seconds'] == 30
        return json.dumps({'answer': 'These modules explain the flow.',
                           'sources': ['security/auth.md', 'audit.md', 'security/auth.md'],
                           'limitations': []})
    monkeypatch.setattr('repobrain_engine.hub.host_runner.run_host_text_generation', route)
    context = await _build_host_runner_agent_context(knowledge, question, settings)
    assert context.count('AUTH KNOWLEDGE') == 1
    assert 'AUDIT KNOWLEDGE' in context
    assert 'UNRELATED FIRST DOCUMENT' not in context


@pytest.mark.asyncio
@pytest.mark.parametrize('result', ['invalid JSON', 'timeout', [], ['../../outside.md'], ['missing.md']])
async def test_failed_or_empty_routing_never_selects_arbitrary_documents(knowledge, settings, monkeypatch, result):
    def route(**kwargs):
        if result == 'timeout':
            raise TimeoutError('backend failed')
        if isinstance(result, str):
            return result
        return json.dumps({'answer': 'Selection', 'sources': result, 'limitations': []})
    monkeypatch.setattr('repobrain_engine.hub.host_runner.run_host_text_generation', route)
    context = await _build_host_runner_agent_context(knowledge, '权限检查', settings)
    assert 'Inspect source files directly' in context
    assert 'AUTH KNOWLEDGE' not in context
    assert 'UNRELATED FIRST DOCUMENT' not in context
    assert 'authentication' in context


@pytest.mark.asyncio
async def test_no_knowledge_skips_routing(tmp_path, settings, monkeypatch):
    def unexpected(**kwargs):
        pytest.fail('No model call is needed without knowledge documents')
    monkeypatch.setattr('repobrain_engine.hub.host_runner.run_host_text_generation', unexpected)
    assert await _build_host_runner_agent_context(tmp_path, '权限检查', settings) == ''
