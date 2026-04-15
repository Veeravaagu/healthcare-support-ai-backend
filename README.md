# Memory-Aware Healthcare Support Chat Backend

A TypeScript backend for a healthcare-adjacent conversational support system that combines persistent chat history, user-level memory summaries, real-time messaging, and a lightweight safety-aware response layer.

This project is designed to showcase backend engineering, AI application design, and practical healthtech product judgment. It focuses on clean service boundaries, simple persistence, and responsible conversational behavior rather than feature volume.

## Problem

Healthcare support conversations often lose useful context between sessions. A user may repeatedly explain the same stressors, preferences, or logistical challenges, which makes support feel generic and fragmented.

This backend addresses that by maintaining a durable `memorySummary` per user and using it alongside recent conversation context to generate more personalized, continuity-aware responses.

## Why Memory-Aware Conversational Systems Matter

In healthcare support settings, continuity matters. Even when a system is not diagnosing or recommending treatment, it can still be more useful if it remembers stable context such as:

- communication preferences
- recurring stressors
- support needs
- care coordination challenges
- personal goals and routines

A lightweight memory layer helps the assistant avoid starting from zero every session while keeping the design simple enough to inspect, test, and evolve.

## Key Features

- REST API for users, conversations, and chat
- Socket.IO support for real-time chat
- swappable storage adapters for Prisma + SQLite or Mongoose + MongoDB
- per-user `memorySummary` used in assistant prompts
- memory summary refreshed after each completed chat turn
- lightweight safety-aware response layer for higher-risk messages
- strict TypeScript, Zod validation, ESLint, Prettier, and a focused test suite

## Architecture Overview

The system is intentionally small and service-oriented:

- Express handles HTTP routing
- Socket.IO handles real-time chat events
- a storage adapter layer keeps REST and socket flows independent from database details
- Prisma manages the SQLite backend
- Mongoose manages the MongoDB backend
- `chatService` owns the main interaction flow
- `aiService` builds prompts, generates replies, and updates memory summaries
- `safetyService` performs a conservative keyword-based safety check on the latest user message

Both REST and WebSocket chat paths reuse the same chat service so behavior stays consistent across transport layers.

## Tech Stack

- Node.js
- TypeScript
- Express
- Socket.IO
- Prisma
- SQLite
- Mongoose
- MongoDB
- Zod
- OpenAI API
- Vitest
- ESLint
- Prettier

## REST API Overview

Base path: `/api`

Core endpoints:

- `GET /health`
- `POST /users`
- `GET /users/:userId`
- `POST /conversations`
- `GET /conversations/user/:userId`
- `GET /conversations/:conversationId`
- `POST /conversations/chat`
- `POST /conversations/:conversationId/chat`

Typical REST chat flow:

1. Create a user
2. Start a chat with `POST /api/conversations/chat`
3. Continue the same thread with `POST /api/conversations/:conversationId/chat`

Each chat response returns:

- the conversation
- the saved user message
- the saved assistant message
- the updated `memorySummary`

## WebSocket Chat Flow

Clients connect through Socket.IO and emit `chat:send` with:

```json
{
  "userId": "USER_ID",
  "conversationId": "OPTIONAL_CONVERSATION_ID",
  "content": "I have been feeling stressed about managing follow-up appointments."
}
```

The server:

1. validates the payload
2. reuses the same `sendChatMessage` service used by REST
3. persists messages
4. updates memory
5. emits `chat:response` or `chat:error`

This keeps transport concerns separate from business logic.

## Memory Summary Design

Each user record stores a `memorySummary` string that acts as durable context across sessions.

During reply generation, the prompt is structured around:

1. the user’s current `memorySummary`
2. recent conversation messages
3. the latest user message

After the assistant reply is saved, the system updates the memory summary from the completed exchange. The goal is not to store everything, but to keep short, durable context that improves future support interactions.

## Safety Layer Design

The safety layer is intentionally modest. It is a demo safeguard, not a crisis system or clinical triage engine.

It checks the latest user message for simple indicators of:

- severe distress
- self-harm risk
- urgent medical concern

If triggered, the assistant is instructed to:

- remain calm and supportive
- avoid diagnosis
- avoid treatment recommendations
- encourage contacting a licensed professional or emergency services when the situation appears urgent

If not triggered, the assistant uses the normal healthcare-support prompt behavior.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Generate the Prisma client:

```bash
npm run prisma:generate
```

4. Initialize the SQLite database when using `STORAGE_BACKEND=sqlite`:

```bash
npm run prisma:push
```

If `prisma db push` fails in a restricted environment, use the bundled fallback initializer:

```bash
npm run db:init
```

5. Start the development server:

```bash
npm run dev
```

6. Run tests:

```bash
npm test
```

## Environment Variables

```env
PORT=3000
STORAGE_BACKEND=sqlite
DATABASE_URL="file:./dev.db"
MONGODB_URL="mongodb://127.0.0.1:27017/healthcare-support-ai"
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Notes:

- if `OPENAI_API_KEY` is not set, the app still runs using deterministic fallback behavior for replies and memory updates
- `STORAGE_BACKEND=sqlite` is the default

## Switching Storage Backends

Set `STORAGE_BACKEND` in `.env`:

```env
STORAGE_BACKEND=sqlite
DATABASE_URL="file:./dev.db"
```

or:

```env
STORAGE_BACKEND=mongodb
MONGODB_URL="mongodb://127.0.0.1:27017/healthcare-support-ai"
```

The API routes and Socket.IO events do not change between backends. The adapter layer keeps the REST and WebSocket flows identical while swapping persistence behind the scenes.

## MongoDB Setup

### Local MongoDB

1. Install MongoDB Community Edition.
2. Start MongoDB locally.
3. Set:

```env
STORAGE_BACKEND=mongodb
MONGODB_URL="mongodb://127.0.0.1:27017/healthcare-support-ai"
```

4. Start the app:

```bash
npm run dev
```

### Docker-based MongoDB

If you already use Docker locally, you can run MongoDB without changing this repo:

```bash
docker run --name healthcare-support-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=healthcare-support-ai \
  -d mongo:7
```

Then use:

```env
STORAGE_BACKEND=mongodb
MONGODB_URL="mongodb://127.0.0.1:27017/healthcare-support-ai"
```

## Testing

`npm test` runs:

- the existing service and safety tests
- an 8-test PrismaAdapter suite against SQLite
- an 8-test MongooseAdapter suite against `mongodb-memory-server`

The MongoDB adapter tests use an in-memory Mongo instance for local zero-dependency execution.

## Limitations and Disclaimer

This project is a portfolio-grade backend prototype, not a medical device and not a substitute for clinical care.

Current limitations:

- no authentication or authorization
- no production deployment configuration
- no advanced observability, rate limiting, or abuse prevention
- no sophisticated safety or escalation workflow
- safety detection is keyword-based and intentionally conservative
- SQLite is appropriate for local development and demos, not high-scale production use

The assistant is healthcare-adjacent only. It should not be used for diagnosis, treatment planning, or emergency decision-making.

## Future Improvements

- add authenticated multi-tenant access control
- move from SQLite to PostgreSQL for production readiness
- expand automated test coverage for database-backed and Socket.IO flows
- add structured observability for chat, safety, and memory update events
- refine memory summarization prompts and retention rules
- add stronger safety review, escalation policies, and human-in-the-loop workflows
