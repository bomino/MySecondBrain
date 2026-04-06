import pytest
from services.llm_stream import format_sse_token, format_sse_sources, format_sse_done, format_sse_error


def test_format_sse_token():
    result = format_sse_token("Hello")

    assert result == 'event: token\ndata: {"text": "Hello"}\n\n'


def test_format_sse_token_with_special_chars():
    result = format_sse_token('He said "hi"')

    assert 'event: token' in result
    assert '"text": "He said \\"hi\\""' in result


def test_format_sse_sources():
    sources = [{"type": "note", "id": "1", "title": "Test", "similarity": 0.8}]

    result = format_sse_sources(sources, "cloud", False)

    assert "event: sources" in result
    assert '"routed_to": "cloud"' in result
    assert '"has_sensitive_context": false' in result


def test_format_sse_done():
    result = format_sse_done()

    assert result == "event: done\ndata: {}\n\n"


def test_format_sse_error():
    result = format_sse_error("Connection refused")

    assert "event: error" in result
    assert "Connection refused" in result
