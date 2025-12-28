# Spur Agent - AI Live Chat Support

A full-stack AI-powered live chat support agent built for Spur's take-home assignment. This application simulates a customer support chat where an AI agent answers user questions about a fictional e-commerce store.

Live @: https://spuragent-frontend.onrender.com

## How to Run Locally

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or cloud)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Step-by-Step Setup


1. Clone repo & Install dependencies:

```bash
git clone https://github.com/salaaris/spuragent.git
cd spuragent
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

2. Set up environment variables:

Create `backend/.env` file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=3001
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/spur_agent
```

3. Set up database:

Create PostgreSQL database:

```bash
createdb spur_agent
```

Or using psql:

```bash
psql -U postgres
CREATE DATABASE spur_agent;
\q
```

4. Run database migrations:

```bash
cd backend
npm run migrate
```

5. Start the application:

```bash
npm run dev
```

This starts:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

## How to Configure Environment Variables

### Backend Environment Variables

Create `backend/.env` with:

```env
PORT=3001
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://user:password@host:port/database
```

For cloud deployment, use the external PostgreSQL connection string from your provider (Render, Supabase, Railway, etc.).

### Frontend Environment Variables (Optional)

For production deployment, set:

```env
VITE_API_URL=https://your-backend-url.com/api
```

## Architecture Overview

### Backend Structure

The backend follows a layered architecture:

**Routes Layer** (`src/routes/`): Express route handlers
- `chat.ts`: Handles `/chat/message` and `/chat/history/:sessionId` endpoints
- Input validation using Zod schemas
- Error handling and HTTP response formatting

**Services Layer** (`src/services/`): Business logic
- `ChatService`: Manages conversations, message persistence, session handling
- `LLMService`: Encapsulates Gemini API integration, prompt construction, error handling

**Data Layer** (`src/db/`): Database abstraction
- `schema.ts`: PostgreSQL connection and query methods
- `migrate.ts`: Database initialization script
- Tables: `conversations` and `messages` with proper foreign key relationships

### Design Decisions

1. **Separation of Concerns**: Each layer has a single responsibility (routes → services → data)
2. **LLM Abstraction**: LLMService is isolated, making it easy to swap providers or add features
3. **Error Handling**: All errors are caught, logged, and returned as user-friendly messages (graceful failure)
4. **Session Management**: Conversations tracked via `sessionId`, persisted in localStorage on frontend
5. **Input Validation**: Zod schemas validate all API inputs before processing
6. **Database**: PostgreSQL with proper schema, indexes, and foreign key constraints

### Frontend Structure

- **SvelteKit**: Reactive framework for UI
- **API Client** (`src/lib/api.ts`): Centralized API communication
- **State Management**: Svelte reactive state for local UI state
- **Session Persistence**: Conversation history loaded on page reload via `sessionId` in localStorage

## LLM Integration

### Provider

Google Gemini via `@google/generative-ai` SDK.

**Model**: `models/gemini-2.5-flash` (with fallback to `models/gemini-pro-latest`)

### Prompt Design

The prompt is constructed in `backend/src/services/llm.ts`:

1. **System Prompt / Domain Knowledge** (hardcoded):
   - Role: "You are a helpful and friendly customer support agent for SpurStore"
   - FAQ knowledge: Shipping policy, return/refund policy, support hours, payment methods, product categories
   - Behavioral guidelines: Clear, concise, friendly, professional

2. **Conversation History**:
   - Last 10 messages included for context
   - Formatted as "Customer: [message]" and "Support Agent: [message]"

3. **Current Message**:
   - User message appended as "Customer: [message]"
   - Followed by "Support Agent:" prompt

**Example prompt structure:**

```
[Domain Knowledge with FAQ information]

Previous conversation:
Customer: What's your return policy?
Support Agent: [AI's previous response]

Customer: How long does it take?
Support Agent:
```

### Error Handling

- Invalid API keys: Clear error message
- Rate limiting: User-friendly retry message
- Timeouts: Connection error message
- Network errors: Graceful failure with retry guidance

All errors are surfaced in the UI (graceful failure > silent failure).

### Cost Control

- Message length capped at 2000 characters (validated, not silently truncated)
- Conversation history limited to last 10 messages
- Single request/response per message (no streaming)

## Trade-offs & "If I Had More Time..."

### Current Trade-offs

1. **Hardcoded Domain Knowledge**: FAQ info is in the prompt. A knowledge base or vector DB would be more scalable for production.
2. **No Authentication**: Sessions tracked via localStorage. Real auth needed for production.
3. **No Rate Limiting**: No per-user rate limits (though message length is capped).
4. **Simple Error Messages**: User-friendly but not detailed for debugging.

### If I Had More Time...

1. **Enhanced LLM Features**: Streaming responses, function calling, response caching
2. **Better Architecture**: Redis for caching, message queue, WebSocket support
3. **Production Readiness**: Comprehensive logging, metrics, rate limiting, API versioning
4. **Testing**: Unit tests, integration tests, E2E tests
5. **Multi-channel Support**: Abstract channel interface for WhatsApp, Instagram, etc.

BUILT WITH CURSOR BY VIGNESH!
