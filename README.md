# Interview Agent

AI-powered technical interview practice. Next.js frontend with a Python (Pydantic AI) backend.

## Setup

### Python backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

Make sure your Anthropic API key is set in `.env.local` at the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Next.js frontend

```bash
npm install
```

## Running

Start both services in separate terminals:

**Terminal 1 — Python backend:**

```bash
cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Next.js frontend:**

```bash
npm run dev
```

Open http://localhost:3000 and click "Start Interview".
