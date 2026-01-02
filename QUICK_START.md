# Quick Start Guide

**For the next agent continuing this project**

## 🎯 Your Mission

Build a production-ready RAG-powered chat interface for querying company SOPs with role-based access control.

## 📋 What's Already Done

✅ Project structure created
✅ 200 detailed test cases defined in `feature_list.json`
✅ Database schema designed (migrations ready)
✅ Backend skeleton (FastAPI)
✅ Frontend skeleton (Next.js 16)
✅ Setup automation script (`init.sh`)
✅ Comprehensive documentation

## 🚀 Getting Started (5 Minutes)

### Step 1: Set Up External Services

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Save your project URL and keys

2. **Get OpenAI API Key**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Create API key
   - Save for later

### Step 2: Configure Environment

```bash
# Backend environment
cd backend
cp .env.example .env
# Edit .env with your credentials:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY
# - JWT_SECRET_KEY (generate with: openssl rand -hex 32)

# Frontend environment
cd ../frontend
cp .env.local.example .env.local
# Edit .env.local with your credentials:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 3: Set Up Database

```bash
# Go to your Supabase project -> SQL Editor
# Run these files in order:
1. database/migrations/001_initial_schema.sql
2. database/migrations/002_indexes.sql
3. database/migrations/003_rls_policies.sql
4. database/seeds/001_sample_users.sql
5. database/seeds/002_sample_sop_permissions.sql
```

### Step 4: Start Development

```bash
# From project root
./init.sh
```

This will:
- Check prerequisites
- Install dependencies
- Start backend on http://localhost:8000
- Start frontend on http://localhost:3000

## 📚 Key Files to Know

| File | Purpose |
|------|---------|
| `feature_list.json` | **THE SINGLE SOURCE OF TRUTH** - All 200 features to implement |
| `init.sh` | One-command setup and server start |
| `claude-progress.txt` | Session summary and next steps |
| `app_spec.txt` | Complete project specification |
| `README.md` | Full documentation |

## 🎯 What to Build Next (Priority Order)

### Phase 1: Foundation (Days 1-2)
- [ ] Database migrations ✅ (ready to run)
- [ ] Backend authentication (JWT, bcrypt)
- [ ] Health check endpoints
- [ ] Test with sample users

### Phase 2: Core RAG (Days 3-4)
- [ ] OpenAI embeddings integration
- [ ] Vector search implementation
- [ ] Permission filtering
- [ ] RAG pipeline with LangChain

### Phase 3: Chat API (Days 5-6)
- [ ] SSE streaming endpoint
- [ ] Conversation CRUD operations
- [ ] Message persistence
- [ ] Source citation tracking

### Phase 4: Frontend Auth (Days 7-8)
- [ ] Login page
- [ ] Auth context/provider
- [ ] Token management
- [ ] Protected routes

### Phase 5: Chat UI (Days 9-12)
- [ ] Chat layout (3-column)
- [ ] Message display
- [ ] Streaming client
- [ ] Conversation sidebar

### Phase 6: Polish (Days 13-15)
- [ ] Dark theme styling
- [ ] Animations and transitions
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design

## 🔍 Testing Your Work

```bash
# Check which features are complete
cat feature_list.json | jq '.[] | select(.passes==true) | .description'

# Check remaining features
cat feature_list.json | jq '.[] | select(.passes==false) | .description'

# Count progress
cat feature_list.json | jq '[.[] | select(.passes==true)] | length'
```

## ⚠️ Critical Rules

1. **NEVER** remove features from `feature_list.json`
2. **NEVER** edit feature descriptions in `feature_list.json`
3. **ONLY** change `"passes": false` to `"passes": true`
4. **ALWAYS** test thoroughly before marking as passing
5. **COMMIT** frequently with descriptive messages

## 🧪 Sample Test Users

After seeding the database:

| Username | Password | Role |
|----------|----------|------|
| admin | password123 | admin |
| hr_manager | password123 | hr |
| finance_manager | password123 | finance |
| manager | password123 | manager |
| employee | password123 | employee |

## 📖 Helpful Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **LangChain Docs**: https://python.langchain.com
- **pgvector Docs**: https://github.com/pgvector/pgvector

## 🆘 Common Issues

### "Module not found"
```bash
# Backend
cd backend && source venv/bin/activate && pip install -r requirements.txt

# Frontend
cd frontend && pnpm install
```

### "Database connection failed"
- Check Supabase project is active
- Verify credentials in .env
- Check network connectivity

### "CORS error"
- Verify CORS_ORIGINS in backend/.env includes frontend URL
- Restart backend server

## 📊 Current Status

- **Total Features**: 200
- **Completed**: 0
- **Remaining**: 200
- **Current Phase**: Database Setup

## 🎓 Development Tips

1. **Work incrementally**: Implement one feature at a time
2. **Test as you go**: Mark features passing only after verification
3. **Use the spec**: Refer to `app_spec.txt` for detailed requirements
4. **Follow the design**: Colors, fonts, spacing all specified
5. **Check examples**: The spec includes detailed implementation steps

## 📝 Before You End Your Session

1. Commit all changes with descriptive messages
2. Update `claude-progress.txt` with what you accomplished
3. Mark completed features as `"passes": true` in `feature_list.json`
4. Leave environment in clean, working state
5. Document any blockers or issues

## 🚢 End Goal

A fully functional, production-ready application where:
- ✅ Users can log in with role-based access
- ✅ Users can ask questions about SOPs in natural language
- ✅ AI streams answers in real-time with source citations
- ✅ Role-based permissions prevent unauthorized access
- ✅ Conversations are saved and manageable
- ✅ Professional, polished B2B interface
- ✅ All 200 features passing

---

**Ready?** Run `./init.sh` and start building! 🚀
