import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from pydantic_ai import Agent, RunContext
from pydantic_ai.messages import (
    ModelRequest,
    ModelResponse,
    TextPart,
    UserPromptPart,
)

logger = logging.getLogger(__name__)

TRANSCRIPTS_DIRECTORY = Path(__file__).resolve().parents[1] / "transcripts"
PROMPTS_DIRECTORY = Path(__file__).resolve().parent / "prompts"

SYSTEM_PROMPT = (PROMPTS_DIRECTORY / "interview.txt").read_text()

agent = Agent("anthropic:claude-sonnet-4-6", instructions=SYSTEM_PROMPT)


def extract_exchanges_from_messages(messages):
    exchanges = []
    for message in messages:
        if isinstance(message, ModelRequest):
            for part in message.parts:
                if isinstance(part, UserPromptPart):
                    exchanges.append({"role": "user", "content": part.content})
        elif isinstance(message, ModelResponse):
            for part in message.parts:
                if isinstance(part, TextPart):
                    exchanges.append({"role": "assistant", "content": part.content})
    return exchanges


@agent.tool
async def save_conversation(context: RunContext) -> dict:
    """Save the full interview transcript to a JSON file. Call this when \
all interview questions have been answered to persist the conversation."""
    now = datetime.now(timezone.utc)
    exchanges = extract_exchanges_from_messages(context.messages)
    filename = f"interview_{now.strftime('%Y%m%dT%H%M%S')}.json"
    filepath = TRANSCRIPTS_DIRECTORY / filename
    transcript = {
        "timestamp": now.isoformat(),
        "exchanges": exchanges,
    }
    filepath.write_text(json.dumps(transcript, indent=2))
    logger.info(
        "transcript_saved",
        extra={
            "file": filename,
            "exchange_count": len(exchanges),
        },
    )
    return {"status": "saved", "file": filename}
