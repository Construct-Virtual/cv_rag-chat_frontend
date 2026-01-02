# SOP AI Agent Chat Interface

A production-ready RAG-powered chat interface for querying company Standard Operating Procedures (SOPs) with role-based access control. Built with Next.js, FastAPI, and Supabase.

## 🌟 Features

- **Intelligent RAG System**: Ask questions in natural language and get answers from your company's SOPs
- **Role-Based Access Control**: Secure document-level permissions ensure users only access authorized content
- **Real-Time Streaming**: AI responses stream word-by-word for a fluid user experience
- **Conversation Management**: Create, save, search, and share conversations
- **Professional B2B Design**: Clean, dark-themed interface inspired by constructvirtual.com
- **Multi-Device Support**: Fully responsive design for desktop, tablet, and mobile

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Next.js 16.1 (App Router)
- Tailwind CSS 4.0
- TypeScript (strict mode)
- Zustand (state management)
- React Server-Sent Events (streaming)

**Backend:**
- FastAPI 0.128.0 (Python 3.11+)
- LangChain 1.2.0
- OpenAI Python SDK 2.14.0
- JWT authentication

**Database:**
- Supabase (PostgreSQL with pgvector)
- OpenAI text-embedding-3-large (3072 dimensions)

**Deployment:**
- Frontend: Vercel
- Backend: Render (Free Tier compatible)

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** ([Download](https://nodejs.org/))
- **Python 3.11+** ([Download](https://www.python.org/))
- **pnpm** (recommended): `npm install -g pnpm`
- **Supabase project** with pgvector extension
- **OpenAI API key**

### One-Command Setup

```bash
./init.sh
```

The `init.sh` script will:
1. Check all prerequisites
2. Create environment files from templates
3. Install all dependencies
4. Start both frontend and backend servers

### Manual Setup

#### 1. Clone and Navigate

```bash
git clone <repository-url>
cd sop-ai-chat
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Run backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Create .env.local file
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run frontend
pnpm dev
```

#### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## ⚙️ Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# JWT
JWT_SECRET_KEY=your-long-random-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=True

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend Environment Variables

Create `frontend/.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🗄️ Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your project URL and keys

### 2. Enable pgvector Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Run Migrations

Execute the SQL scripts in `database/migrations/` in order:

```bash
# Connect to your Supabase database and run:
psql -h db.your-project.supabase.co -U postgres -d postgres -f database/migrations/001_initial_schema.sql
psql -h db.your-project.supabase.co -U postgres -d postgres -f database/migrations/002_indexes.sql
psql -h db.your-project.supabase.co -U postgres -d postgres -f database/migrations/003_rls_policies.sql
```

### 4. Seed Initial Data

```sql
-- Create admin user
INSERT INTO users (username, password_hash, full_name, email, role)
VALUES (
  'admin',
  '$2b$12$...', -- Use bcrypt to hash 'admin123' or your chosen password
  'System Administrator',
  'admin@company.com',
  'admin'
);

-- Create sample SOP permissions
INSERT INTO sop_permissions (file_name, display_name, description, is_public, category)
VALUES (
  'general_guidelines.pdf',
  'General Company Guidelines',
  'Company-wide policies and procedures',
  true,
  'General'
);
```

## 📚 Project Structure

```
sop-ai-chat/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Configuration
│   │   ├── models/              # Pydantic models
│   │   ├── routers/             # API endpoints
│   │   │   ├── auth.py          # Authentication routes
│   │   │   ├── chat.py          # Chat routes
│   │   │   └── sops.py          # SOP management routes
│   │   ├── services/            # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── rag_service.py   # RAG pipeline
│   │   │   └── chat_service.py
│   │   └── utils/               # Helper functions
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/           # Login page
│   │   ├── (protected)/
│   │   │   └── chat/            # Main chat interface
│   │   └── shared/              # Shared conversations
│   ├── components/              # React components
│   │   ├── chat/
│   │   ├── ui/
│   │   └── layout/
│   ├── lib/                     # Utilities
│   │   ├── api-client.ts        # API wrapper
│   │   └── supabase.ts          # Supabase client
│   ├── hooks/                   # Custom React hooks
│   ├── stores/                  # Zustand stores
│   ├── types/                   # TypeScript types
│   ├── package.json
│   └── .env.local
├── database/
│   ├── migrations/              # SQL migration scripts
│   └── seeds/                   # Seed data
├── feature_list.json            # Complete test case list
├── init.sh                      # Setup and run script
└── README.md
```

## 🧪 Testing

### Feature Testing

We use a comprehensive feature list approach. All features are tracked in `feature_list.json`:

```bash
# View all features
cat feature_list.json | jq '.[] | select(.passes==false)'

# Count remaining features
cat feature_list.json | jq '[.[] | select(.passes==false)] | length'
```

### Running Tests (Future)

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
pnpm test
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Password Hashing**: bcrypt with salt
- **Role-Based Access Control**: Document-level permissions
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Input sanitization
- **CORS Protection**: Configured for specific origins
- **HTTPS Enforcement**: In production
- **Audit Logging**: Security events tracked

## 🎨 Design System

### Color Palette (Dark Theme)

```css
Background Primary:   #0A0A0A
Background Secondary: #1A1A1A
Background Tertiary:  #2A2A2A
Accent Primary:       #3B82F6 (Blue)
Accent Secondary:     #8B5CF6 (Purple)
Text Primary:         #F5F5F5
Text Secondary:       #A1A1A1
Border:               #2A2A2A
Success:              #10B981
Error:                #EF4444
```

### Typography

- **Font**: Inter, system fonts
- **Code**: JetBrains Mono, Fira Code
- **Sizes**: 14px (small), 16px (body), 20-30px (headings)

## 🚢 Deployment

### Backend (Render)

1. Create Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
4. Add environment variables
5. Deploy

### Frontend (Vercel)

1. Import project to Vercel
2. Framework: Next.js (auto-detected)
3. Add environment variables
4. Deploy

### Post-Deployment

1. Update CORS_ORIGINS in backend with Vercel URL
2. Update NEXT_PUBLIC_API_URL in frontend with Render URL
3. Test full authentication flow
4. Verify RAG pipeline works in production

## 📖 API Documentation

Once the backend is running, visit:

**Swagger UI**: http://localhost:8000/docs

**ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and invalidate token
- `GET /api/auth/me` - Get current user info

#### Chat
- `POST /api/chat/query` - Send query (SSE streaming)
- `GET /api/chat/conversations` - List conversations
- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations/:id` - Get conversation
- `PUT /api/chat/conversations/:id` - Update conversation
- `DELETE /api/chat/conversations/:id` - Delete conversation
- `POST /api/chat/conversations/:id/share` - Share conversation

#### SOPs
- `GET /api/sops` - List accessible SOPs
- `GET /api/sops/:file_name/permissions` - Get SOP permissions

## 🤝 Contributing

This is a production development project. All features are tracked in `feature_list.json`.

To contribute:
1. Pick a feature with `"passes": false`
2. Implement the feature
3. Test thoroughly
4. Update `"passes": true` only when verified
5. Commit your changes

## 📝 Development Notes

- **Never remove features** from feature_list.json
- **Never edit feature descriptions** in feature_list.json
- **Only mark features as passing** after thorough testing
- **Commit frequently** with descriptive messages
- **Test role-based access** thoroughly
- **Verify streaming works** across browsers

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check Python version
python3 --version  # Should be 3.11+

# Activate virtual environment
source backend/venv/bin/activate

# Reinstall dependencies
pip install --upgrade -r backend/requirements.txt
```

### Frontend won't start

```bash
# Clear cache
rm -rf frontend/.next
rm -rf frontend/node_modules

# Reinstall dependencies
cd frontend
pnpm install
```

### Database connection issues

1. Verify Supabase URL and keys in .env
2. Check Supabase project is active
3. Verify pgvector extension is enabled
4. Test connection with psql

### CORS errors

1. Check CORS_ORIGINS in backend/.env
2. Ensure frontend URL is whitelisted
3. Verify both servers are running
4. Check browser console for exact error

## 📄 License

Copyright © 2024. All rights reserved.

## 🙏 Acknowledgments

- Design inspiration: constructvirtual.com
- Built with Claude Code
- Powered by OpenAI, Supabase, Vercel, and Render

---

**Need Help?** Check the troubleshooting section or review the feature_list.json for implementation guidance.
