# Telemedicine Chatbot Setup Instructions

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- OpenAI API key

## Quick Setup

1. **Clone and Install**

   ```bash
   git clone <your-repo>
   cd telemedicine-chatbot
   npm install
   ```

2. **Environment Setup**
   Create `.env.local` file with:

   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/telemedicine_chatbot"
   OPENAI_API_KEY="your-openai-api-key"
   JWT_SECRET="your-secret-key"
   NEXTAUTH_SECRET="your-nextauth-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ADMIN_EMAIL="admin@example.com"
   ADMIN_PASSWORD="admin123"
   ```

3. **Database Setup**

   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. **Start Development**

   ```bash
   npm run dev
   ```

5. **Access Application**
   - Chat Interface: http://localhost:3000/chat
   - Admin Dashboard: http://localhost:3000/admin
   - Login with: admin@example.com / admin123

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment

```bash
npm run build
npm start
```

## Features

✅ Real-time chat interface
✅ Knowledge base management
✅ Admin dashboard
✅ Medical content versioning
✅ Analytics and gap detection
✅ OpenAI integration
✅ Database persistence
✅ Responsive design

## Project Structure

- `/src/app` - Next.js 13+ app router
- `/src/components` - Reusable React components
- `/src/lib` - Utility functions and integrations
- `/prisma` - Database schema and migrations

## Next Steps

1. Customize the knowledge base with your medical content
2. Set up production database (PostgreSQL on AWS RDS, etc.)
3. Configure proper authentication
4. Add more advanced NLP features
5. Implement proper medical review workflow
6. Add integration with EHR systems
7. Set up monitoring and logging

## Support

For issues or questions, please create an issue in the repository.
