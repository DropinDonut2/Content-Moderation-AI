# Moderate System (AI)

An advanced, AI-powered content moderation platform that automates initial content screening, enforces policy compliance, and provides detailed analytics. Built with a "Strict Minimalist" design philosophy for high-efficiency data oversight.

## ✨ Key Features

- **🤖 AI-Powered Analysis** — Automated screening using Claude (via OpenRouter) & LangChain.
- **🛡️ Policy Protocol** — Centralized rule management for consistent enforcement.
- **📊 Real-Time Analytics** — Live dashboard with volume, latency, and verdict distribution metrics.
- **👁️ Review Queue** — Manual oversight workflow for flagged/uncertain content.
- **🎨 Minimalist UI** — High-contrast "Data Terminal" aesthetic (Black & White) using Tailwind CSS.
- **📈 Detailed Logging** — Full audit trail of all AI decisions and human reviews.

## 🛠️ Tech Stack

### Core
| Component | Technology |
|-----------|------------|
| **Frontend** | React 18, Vite |
| **Styling** | Tailwind CSS (v3), Lucide React (Icons) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose |

### AI & Data
| Component | Technology |
|-----------|------------|
| **LLM Orchestration** | LangChain.js |
| **Model Provider** | OpenRouter (Claude-3-Haiku default) |
| **Visualization** | Recharts |

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- MongoDB 6+
- OpenRouter API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/content-moderation-ai.git
   cd content-moderation-ai
   ```

2. **Setup Environment**
   ```bash
   # Create .env file in root
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/content-moderation
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   AI_MODEL=anthropic/claude-3-haiku
   CONFIDENCE_THRESHOLD=0.7
   ```

3. **Install Dependencies**
   The project is split into two parts. You must install dependencies for both.
   
   **Backend (Express + LangChain)**
   ```bash
   cd server
   npm install
   # This installs: express, mongoose, @langchain/openai, @langchain/core, cors, dotenv
   ```

   **Frontend (React + Tailwind)**
   ```bash
   cd ../client
   npm install
   # This installs: react, tailwindcss, lucide-react, recharts, axios
   ```

4. **Seed Database** (Optional)
   ```bash
   cd server
   npm run seed
   ```

5. **Run Application**
   ```bash
   # Terminal 1: Backend
   cd server
   npm run dev

   # Terminal 2: Frontend
   cd client
   npm run dev
   ```

## 📦 Key Packages Explained

- **`tailwindcss`**: Utility-first CSS framework (configured in `client/tailwind.config.js`).
- **`@langchain/openai`**: Library to interface with OpenRouter/OpenAI models (used in `server/services/moderationService.js`).
- **`lucide-react`**: Icon library for the new monochrome UI (used across `client/src/components/`).
- **`recharts`**: Charting library for the Analytics Dashboard.

## 📡 API Endpoints

### Core Moderation
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/moderate` | Submit content for AI analysis |
| `GET` | `/api/v1/logs` | Fetch moderation history |
| `PATCH` | `/api/v1/logs/:id/review` | Submit human review decision |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/analytics/overview` | Dashboard summary metrics |
| `GET` | `/api/v1/analytics/timeseries` | Chart data (volume over time) |
| `GET` | `/api/v1/analytics/categories` | Violation distribution |

### Policy Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/policies` | List all active policies |
| `POST` | `/api/v1/policies` | Create new policy definition |

## 🎨 Design System

The UI follows a **Strict Minimalist (B&W)** theme:
- **Font**: DM Mono (Google Fonts)
- **Colors**: Black (`#09090b`), White (`#ffffff`), Gray (`#a1a1aa`)
- **Status Colors**: Green (Safe), Red (Rejected), Amber (Flagged)
- **Icons**: Lucide React (No emojis)

## License

MIT
