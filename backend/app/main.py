from pathlib import Path

from dotenv import load_dotenv

# Load the Anthropic API key from the project root .env.local
load_dotenv(Path(__file__).resolve().parents[2] / ".env.local")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response
from pydantic_ai.ui.vercel_ai import VercelAIAdapter

from app.agent import agent

app = FastAPI(title="Interview Agent Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.post("/chat")
async def chat(request: Request) -> Response:
    return await VercelAIAdapter.dispatch_request(request, agent=agent)
