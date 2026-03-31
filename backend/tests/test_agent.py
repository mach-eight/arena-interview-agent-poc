import json

import pytest
from pydantic_ai.messages import (
    ModelRequest,
    ModelResponse,
    TextPart,
    UserPromptPart,
)

from app.agent import (
    SYSTEM_PROMPT,
    agent,
    extract_exchanges_from_messages,
    save_conversation,
)


class TestSystemPrompt:
    def test_contains_all_four_questions(self):
        assert "challenging technical project" in SYSTEM_PROMPT
        assert "debugging a complex issue" in SYSTEM_PROMPT
        assert "URL shortener" in SYSTEM_PROMPT
        assert "technical decision you made that you later regretted" in SYSTEM_PROMPT

    def test_contains_role_section(self):
        assert "## ROLE" in SYSTEM_PROMPT

    def test_contains_flow_section(self):
        assert "## FLOW" in SYSTEM_PROMPT

    def test_contains_off_topic_section(self):
        assert "## HANDLING OFF-TOPIC" in SYSTEM_PROMPT

    def test_contains_ending_section(self):
        assert "## ENDING" in SYSTEM_PROMPT

    def test_instructs_not_to_score(self):
        assert "Do not evaluate or score answers aloud" in SYSTEM_PROMPT


class TestAgentConfiguration:
    def test_agent_model(self):
        assert agent.model.model_name == "claude-sonnet-4-6"

    def test_agent_has_save_conversation_tool(self):
        assert "save_conversation" in agent._function_toolset.tools


class TestExtractExchangesFromMessages:
    def test_extracts_user_messages(self):
        messages = [
            ModelRequest(parts=[UserPromptPart(content="Hello")]),
        ]
        result = extract_exchanges_from_messages(messages)
        assert result == [{"role": "user", "content": "Hello"}]

    def test_extracts_assistant_messages(self):
        messages = [
            ModelResponse(parts=[TextPart(content="Hi there")]),
        ]
        result = extract_exchanges_from_messages(messages)
        assert result == [{"role": "assistant", "content": "Hi there"}]

    def test_extracts_mixed_conversation(self):
        messages = [
            ModelRequest(parts=[UserPromptPart(content="Start")]),
            ModelResponse(parts=[TextPart(content="Welcome")]),
            ModelRequest(parts=[UserPromptPart(content="My answer")]),
            ModelResponse(parts=[TextPart(content="Great, next question")]),
        ]
        result = extract_exchanges_from_messages(messages)
        assert len(result) == 4
        assert result[0] == {"role": "user", "content": "Start"}
        assert result[1] == {"role": "assistant", "content": "Welcome"}
        assert result[2] == {"role": "user", "content": "My answer"}
        assert result[3] == {
            "role": "assistant",
            "content": "Great, next question",
        }

    def test_empty_messages(self):
        result = extract_exchanges_from_messages([])
        assert result == []

    def test_ignores_non_text_parts_in_response(self):
        messages = [
            ModelResponse(parts=[]),
        ]
        result = extract_exchanges_from_messages(messages)
        assert result == []


class TestSaveConversation:
    @pytest.fixture
    def transcript_directory(self, tmp_path):
        return tmp_path / "transcripts"

    @pytest.fixture(autouse=True)
    def patch_transcripts_directory(self, mocker, transcript_directory):
        transcript_directory.mkdir()
        mocker.patch("app.agent.TRANSCRIPTS_DIRECTORY", transcript_directory)

    @pytest.fixture
    def mock_context(self, mocker):
        context = mocker.MagicMock()
        context.messages = [
            ModelRequest(parts=[UserPromptPart(content="Hello")]),
            ModelResponse(parts=[TextPart(content="Welcome to the interview")]),
        ]
        return context

    @pytest.mark.asyncio
    async def test_saves_transcript_file(self, mock_context, transcript_directory):
        result = await save_conversation(mock_context)
        assert result["status"] == "saved"
        saved_files = list(transcript_directory.glob("interview_*.json"))
        assert len(saved_files) == 1

    @pytest.mark.asyncio
    async def test_transcript_contains_exchanges(self, mock_context, transcript_directory):
        await save_conversation(mock_context)
        saved_file = next(transcript_directory.glob("interview_*.json"))
        transcript = json.loads(saved_file.read_text())
        assert len(transcript["exchanges"]) == 2
        assert transcript["exchanges"][0]["role"] == "user"
        assert transcript["exchanges"][1]["role"] == "assistant"

    @pytest.mark.asyncio
    async def test_transcript_contains_timestamp(self, mock_context, transcript_directory):
        await save_conversation(mock_context)
        saved_file = next(transcript_directory.glob("interview_*.json"))
        transcript = json.loads(saved_file.read_text())
        assert "timestamp" in transcript

    @pytest.mark.asyncio
    async def test_transcript_is_formatted_json(self, mock_context, transcript_directory):
        await save_conversation(mock_context)
        saved_file = next(transcript_directory.glob("interview_*.json"))
        raw_content = saved_file.read_text()
        assert "\n" in raw_content
        assert "  " in raw_content

    @pytest.mark.asyncio
    async def test_returns_filename(self, mock_context):
        result = await save_conversation(mock_context)
        assert result["file"].startswith("interview_")
        assert result["file"].endswith(".json")
