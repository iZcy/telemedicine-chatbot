# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development Server
- `npm run dev` - Start both client (port 3000) and server (port 3001) concurrently
- `npm run dev:client` - Start only the Vite React client
- `npm run dev:server` - Start only the Express server with hot reload

### Build and Production
- `npm run build` - Build the client application for production
- `npm run preview` - Preview the built client application
- `npm run server` - Start the production server

### Database Operations
- `npm run db:push` - Push Prisma schema changes to database
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio for database management

### Health Checks and Testing
- `npm run health:check` - Check AI service health status
- `npm run test:ai` - Test AI service manager functionality
- `npm run stats:demo` - Test statistics service

### WhatsApp Integration
- `npm run whatsapp:init` - Initialize WhatsApp service and generate QR code

## Architecture Overview

This is a full-stack telemedicine chatbot application with the following key components:

### Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI Service**: DeepSeek AI via OpenRouter API
- **WhatsApp**: whatsapp-web.js integration
- **Authentication**: JWT-based auth

### Server Architecture (`server/`)
- **Main Server**: `server/index.ts` - Express app with security middleware, rate limiting, and route setup
- **Core Services**:
  - `lib/ai-service-manager.ts` - AI service with retry logic and fallback handling
  - `lib/rag-service.ts` - RAG (Retrieval Augmented Generation) for knowledge search
  - `lib/whatsapp-service.ts` - WhatsApp Web integration
  - `lib/stats-service.ts` - Analytics and statistics
- **Routes**: RESTful API endpoints for chat, auth, knowledge, stats, WhatsApp, and health
- **Database**: Prisma client for PostgreSQL operations

### Client Architecture (`src/`)
- **Main App**: React SPA with React Router for navigation
- **Authentication**: Context-based auth system with protected routes
- **Pages**: 
  - Chat interface for user interactions
  - Admin dashboard for system management
  - Analytics page for usage statistics
- **Components**: Modular React components for chat, admin functions, and UI elements

### Database Schema (Prisma)
Key models:
- `User` - Authentication and user management
- `KnowledgeEntry` - Medical knowledge base with versioning
- `ChatSession`/`ChatMessage` - Conversation tracking
- `QueryMatch` - RAG search analytics
- `KnowledgeGap` - Identifies missing knowledge areas

### AI and RAG System
- **DeepSeek Integration**: Via OpenRouter API with comprehensive retry logic
- **Knowledge Search**: Keyword, title, and content-based matching with relevance scoring
- **Context Building**: Assembles relevant medical knowledge for AI responses
- **Fallback Handling**: Graceful degradation when AI services are unavailable

### WhatsApp Integration
- Uses puppeteer-based WhatsApp Web client
- QR code authentication for setup
- Message handling with AI response generation

## Environment Configuration

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `DEEPSEEK_API_KEY` - DeepSeek AI API key
- `JWT_SECRET` - JWT signing secret
- `ADMIN_EMAIL`/`ADMIN_PASSWORD` - Admin account credentials
- `ENABLE_WHATSAPP` - Enable/disable WhatsApp integration
- `CLIENT_URL` - Frontend URL for CORS (default: http://localhost:3000)

## Development Notes

### Server Development
- Server runs on port 3001 with hot reload via `tsx watch`
- API endpoints are prefixed with `/api/`
- Health checks available at `/health/` endpoints

### Client Development  
- Client runs on port 3000 with Vite dev server
- API calls are proxied to backend server
- Uses React Router for SPA navigation

### Database Management
- Use Prisma Studio for visual database management
- Seed file includes Indonesian medical knowledge base
- Run `db:push` after schema changes, `db:seed` for initial data

### AI Service Management
- Retry logic handles API failures gracefully
- Health checks monitor AI service availability
- Fallback messages in Indonesian for various error scenarios

### Testing and Health Monitoring
- Use health check commands to verify system status
- Monitor AI service performance and availability
- Analytics dashboard provides usage insights