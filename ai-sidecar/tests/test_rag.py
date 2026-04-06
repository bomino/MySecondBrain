import pytest
from services.rag import filter_chunks_by_similarity, build_system_prompt, build_multi_turn_prompt, MIN_SIMILARITY_THRESHOLD


def test_filters_chunks_below_threshold():
    # #given
    chunks = [
        {"chunk_text": "relevant", "similarity": 0.6, "entity_type": "note", "entity_id": "1", "title": "A"},
        {"chunk_text": "irrelevant", "similarity": 0.1, "entity_type": "note", "entity_id": "2", "title": "B"},
        {"chunk_text": "borderline", "similarity": 0.3, "entity_type": "note", "entity_id": "3", "title": "C"},
    ]

    # #when
    filtered = filter_chunks_by_similarity(chunks)

    # #then
    assert len(filtered) == 2
    assert filtered[0]["chunk_text"] == "relevant"
    assert filtered[1]["chunk_text"] == "borderline"


def test_returns_empty_when_all_below_threshold():
    # #given
    chunks = [
        {"chunk_text": "low", "similarity": 0.1, "entity_type": "note", "entity_id": "1", "title": "A"},
    ]

    # #when
    filtered = filter_chunks_by_similarity(chunks)

    # #then
    assert filtered == []


def test_threshold_constant_is_0_3():
    assert MIN_SIMILARITY_THRESHOLD == 0.3


def test_system_prompt_with_context():
    # #when
    prompt = build_system_prompt(has_context=True)

    # #then
    assert "ONLY the provided context" in prompt
    assert "general knowledge" not in prompt


def test_system_prompt_without_context():
    # #when
    prompt = build_system_prompt(has_context=False)

    # #then
    assert "did not contain relevant information" in prompt
    assert "general knowledge" in prompt


def test_build_multi_turn_prompt_with_history():
    # #given
    messages = [
        {"role": "user", "content": "What are my goals?"},
        {"role": "assistant", "content": "Based on your notes, you have 3 goals..."},
    ]
    new_query = "Tell me more about the second one"
    context = "[Goals] (note):\nMy goals are: 1. Learn Rust 2. Ship product 3. Exercise"

    # #when
    result = build_multi_turn_prompt(new_query, context, messages)

    # #then
    assert "What are my goals?" in result
    assert "Based on your notes, you have 3 goals" in result
    assert "Tell me more about the second one" in result
    assert context in result


def test_build_multi_turn_prompt_without_history():
    # #given
    new_query = "What did I write?"
    context = "[Notes] (note):\nSome content"

    # #when
    result = build_multi_turn_prompt(new_query, context, messages=None)

    # #then
    assert "What did I write?" in result
    assert context in result


def test_build_multi_turn_prompt_without_context():
    # #given
    new_query = "What is the speed of light?"

    # #when
    result = build_multi_turn_prompt(new_query, context=None, messages=None)

    # #then
    assert "What is the speed of light?" in result
    assert "Context from knowledge base" not in result
