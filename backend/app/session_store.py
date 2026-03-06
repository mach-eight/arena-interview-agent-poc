import uuid

STUB_QUESTIONS = [
    "Tell me about a challenging technical project you worked on recently. What was your role, and what made it challenging?",
    "How do you approach debugging a complex issue in a production system?",
    "Describe your experience with system design. How would you design a URL shortener?",
    "What's a technical decision you made that you later regretted? What did you learn from it?",
]


class SessionStore:
    """In-memory session state. Mirrors the TypeScript Map<string, number> pattern."""

    def __init__(self):
        self._counters: dict[str, int] = {}

    def create_session(self) -> str:
        session_id = f"session-{uuid.uuid4().hex[:8]}"
        self._counters[session_id] = 0
        return session_id

    def get_next_question(self, session_id: str) -> dict:
        index = self._counters.get(session_id, 0)
        if index >= len(STUB_QUESTIONS):
            return {"done": True}
        self._counters[session_id] = index + 1
        return {
            "done": False,
            "question_id": f"q{index + 1}",
            "question_text": STUB_QUESTIONS[index],
            "question_number": index + 1,
            "total_estimate": len(STUB_QUESTIONS),
        }

    def close_session(self, session_id: str) -> None:
        self._counters.pop(session_id, None)


session_store = SessionStore()
