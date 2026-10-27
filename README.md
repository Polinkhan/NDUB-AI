# NDUB AI Assistant

An authenticated AI assistant for the NDUB student portal. It uses NVIDIA NIM for streamed tool-calling responses, the student portal APIs for personal academic data, and Tavily for public web search.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add your NVIDIA and Tavily API keys and a tool-capable NVIDIA model ID.
3. Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Students sign in with their existing NDUB portal credentials.

## Commands

```bash
npm run dev
npm run test
npm run lint
npm run build
```

Portal credentials are never stored. Access and refresh tokens use secure HTTP-only cookies, while conversation history stays in the current browser tab's session storage and is cleared on logout.
