# AI Content Moderation System

An AI-powered content moderation API that automates initial content screening using LLMs, makes consistent decisions based on centralized policies, and provides full audit trails.

## Features

- 🤖 **AI-Powered Moderation** — Automated content screening using Claude via OpenRouter
- 📋 **Policy-Based Analysis** — Decisions reference stored moderation policies
- 🏷️ **Violation Classification** — Categorizes: hate_speech, harassment, spam, nsfw, violence, misinformation, self_harm, illegal
- 📊 **Confidence Scoring** — Returns 0-1 confidence for each decision
- 📝 **Policy Citation** — Every rejection includes the specific policy violated
- 📈 **Audit Trail** — All decisions logged in MongoDB
- 👥 **Human Review Queue** — Uncertain content queued for manual review

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Backend | Express.js 4 + Node.js 20 |
| Database | MongoDB 6 + Mongoose 8 |
| AI Orchestration | LangChain.js |
| AI Provider | OpenRouter API |

## Project Structure

```
content-moderation/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── services/       # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/                 # Express backend
│   ├── config/             # Database config
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── prompts/            # AI prompt templates
│   ├── scripts/            # Utility scripts
│   ├── server.js
│   └── package.json
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 6+
- OpenRouter API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/content-moderation-ai.git
   cd content-moderation-ai
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   ```

5. **Seed the database**
   ```bash
   cd server
   npm run seed
   ```

6. **Start the development servers**
   ```bash
   # Terminal 1 - Backend
   cd server
   npm run dev

   # Terminal 2 - Frontend
   cd client
   npm run dev
   ```

## API Endpoints

### Moderation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/moderate | Analyze content |
| GET | /api/v1/logs | Get moderation history |
| GET | /api/v1/logs/:id | Get single log |
| PATCH | /api/v1/logs/:id/review | Submit human review |

### Policies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/policies | List all policies |
| GET | /api/v1/policies/:id | Get single policy |
| POST | /api/v1/policies | Create policy |
| PUT | /api/v1/policies/:id | Update policy |
| DELETE | /api/v1/policies/:id | Delete policy |

## Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/content-moderation
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
AI_MODEL=anthropic/claude-3-haiku
CONFIDENCE_THRESHOLD=0.7
NODE_ENV=development
```

## License

MIT
