from pydantic_ai import Agent

from app.session_store import session_store

SYSTEM_PROMPT = """\
You are an interview agent conducting a structured technical interview.

Follow this protocol strictly:
1. When the conversation starts, call initiate_session to begin.
2. After session initiation, call get_next_question to get the first question.
3. Present each question naturally to the candidate — do not reveal question IDs or metadata.
4. When the candidate answers, call submit_question_answer with their response, then call get_next_question for the next one.
5. When get_next_question returns done: true, call close_session and say goodbye with a brief thank-you.

Rules:
- NEVER invent or improvise your own questions. Only use questions from get_next_question.
- Keep your conversational turns brief — the focus is on the candidate's answers.
- Be encouraging but neutral. Do not evaluate or score answers aloud."""

agent = Agent(
    "anthropic:claude-sonnet-4-6",
    instructions=SYSTEM_PROMPT,
)


@agent.tool_plain
async def initiate_session(candidate_name: str = "Anonymous") -> dict:
    """Start a new interview session.

    Args:
        candidate_name: Name of the candidate.
    """
    session_id = session_store.create_session()
    return {
        "session_id": session_id,
        "candidate_name": candidate_name,
        "message": "Session started",
    }


@agent.tool_plain
async def get_next_question(session_id: str) -> dict:
    """Get the next interview question. Returns done: true when all questions have been asked.

    Args:
        session_id: The session ID.
    """
    return session_store.get_next_question(session_id)


@agent.tool_plain
async def submit_question_answer(
    session_id: str, question_id: str, candidate_response: str
) -> dict:
    """Submit the candidate's answer to a question.

    Args:
        session_id: The session ID.
        question_id: The question ID being answered.
        candidate_response: The candidate's answer verbatim.
    """
    print(
        f"[stub] Answer recorded for {question_id} in session {session_id}: "
        f"{candidate_response[:80]}..."
    )
    return {"recorded": True}


@agent.tool_plain
async def close_session(session_id: str) -> dict:
    """Close the interview session when all questions are done.

    Args:
        session_id: The session ID.
    """
    session_store.close_session(session_id)
    return {"status": "completed"}
