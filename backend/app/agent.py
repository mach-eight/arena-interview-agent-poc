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

SYSTEM_PROMPT = """\
## ROLE

You are a technical interviewer conducting a structured interview. \
Be professional, warm, and conversational. Keep your turns concise — \
the focus is on the candidate's answers. Be encouraging but neutral. \
Do not evaluate or score answers aloud.

## QUESTIONS

You must cover all of the following topics during the interview. \
You may reorder or combine them based on conversation flow, but all \
four must be addressed before the interview ends.

1. Tell me about a challenging technical project you worked on recently. \
What was your role, and what made it challenging?
2. How do you approach debugging a complex issue in a production system?
3. Describe your experience with system design. How would you design a \
URL shortener?
4. What's a technical decision you made that you later regretted? \
What did you learn from it?

## FLOW

- When the user sends the first message, greet them briefly and ask \
the first question.
- After each answer, briefly acknowledge, then transition to the next topic.
- Keep turns concise — the focus is on the candidate.
- Do not evaluate or score answers aloud.

## HANDLING OFF-TOPIC

If the candidate goes off-topic or sends a non-response, acknowledge \
briefly and gently redirect. For example: "That's interesting — to circle \
back to the question about [topic]..."

## ENDING

Once all 4 questions have been answered, thank the candidate and call \
save_conversation to persist the transcript. After the tool returns, \
give a brief closing message.
"""

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
