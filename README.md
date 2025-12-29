# Asteroids - Type Defender

A 3D typing space game to improve your typing skills, built with A-Frame and Three.js.

## Project Structure

```
Asteroids/
├── backend/          # Express.js API server with Supabase
├── database/         # SQL schema for Supabase
└── frontend/         # Vite + A-Frame game client
```

## Prerequisites

- Node.js >= 18.0.0
- A [Supabase](https://supabase.com) account and project

## Database Setup (Supabase)

1. Create a new project on [Supabase](https://supabase.com)

2. Go to the SQL Editor in your Supabase dashboard

3. Copy the contents of `database/schema.sql` and run it in the SQL Editor

4. Get your project credentials from Settings > API:
   - Project URL (SUPABASE_URL)
   - anon/public key (SUPABASE_ANON_KEY)

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   PORT=3000
   FRONTEND_URL=http://localhost:5173
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### API Endpoints

| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| GET    | `/`                       | API info                       |
| GET    | `/health`                 | Health check                   |
| GET    | `/api/scores`             | Get all scores (paginated)     |
| GET    | `/api/scores/leaderboard` | Get top 10 scores              |
| GET    | `/api/scores/:id`         | Get a specific score           |
| POST   | `/api/scores`             | Submit a new score             |

#### Submit Score Request Body

```json
{
  "player_name": "string (required, max 50 chars)",
  "score": "number (required, >= 0)",
  "words_typed": "number (optional)",
  "accuracy": "number (optional, 0-100)",
  "game_duration": "number (optional, seconds)",
  "difficulty": "string (optional, default: 'normal')"
}
```

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Create a `.env` file if using a different API URL:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The game will open in your browser at `http://localhost:5173`

## Development

### Running Both Servers

In separate terminals:

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

## Tech Stack

- **Frontend**: Vite, A-Frame, Three.js
- **Backend**: Express.js, Node.js
- **Database**: Supabase (PostgreSQL)

## License

MIT


## Team Roles
- **Arrubio** – Backend & Core Logic

- Supabase integration
- API endpoints
- Game logic structure
- Project integration
- Code review
- Project management
