# Chatbot Medis Telemedicine Indonesia

Sistem chatbot medis berbasis AI yang menggunakan teknologi DeepSeek untuk memberikan informasi kesehatan dalam bahasa Indonesia.

## 🚀 Fitur Utama

- **AI DeepSeek**: Powered by DeepSeek AI untuk respons yang akurat
- **RAG System**: Sistem pencarian cerdas untuk informasi medis
- **Bahasa Indonesia**: Interface dan respons dalam bahasa Indonesia
- **WhatsApp Integration**: Akses melalui WhatsApp Web
- **Real-time Analytics**: Dashboard analitik dengan data real-time
- **Knowledge Base**: Basis pengetahuan medis yang dapat dikelola
- **Responsive Design**: Tampilan yang responsif di semua perangkat

## 📋 Prasyarat

- Node.js 18+
- PostgreSQL database
- DeepSeek API key

## 🛠️ Instalasi Cepat

1. **Clone dan Install**

   ```bash
   git clone <your-repo>
   cd telemedicine-chatbot
   npm install
   ```

2. **Setup Environment**

   Copy file `.env.example` ke `.env.local` dan isi variabel berikut:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/telemedicine_chatbot"
   DEEPSEEK_API_KEY="your-deepseek-api-key"
   JWT_SECRET="your-secret-key"
   ADMIN_EMAIL="admin@example.com"
   ADMIN_PASSWORD="admin123"
   ENABLE_WHATSAPP="true"
   ```

3. **Setup Database**

   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. **Jalankan Development**

   ```bash
   npm run dev
   ```

5. **Akses Aplikasi**
   - Chat Interface: http://localhost:3000/chat
   - Admin Dashboard: http://localhost:3000/admin
   - Login dengan: admin@example.com / admin123

## 📱 Setup WhatsApp (Opsional)

1. **Aktifkan WhatsApp di Environment**

   ```env
   ENABLE_WHATSAPP="true"
   ```

2. **Inisialisasi WhatsApp**

   ```bash
   npm run whatsapp:init
   ```

3. **Scan QR Code**

   - QR code akan muncul di terminal
   - Scan dengan WhatsApp di ponsel Anda

4. **Test WhatsApp Bot**
   - Kirim pesan ke nomor WhatsApp yang sudah di-setup
   - Bot akan merespons dengan menu dan informasi

## 🔧 Konfigurasi AI

### DeepSeek API Setup

1. Daftar di [DeepSeek Platform](https://platform.deepseek.com)
2. Dapatkan API key
3. Tambahkan ke `.env.local`:
   ```env
   DEEPSEEK_API_KEY="your-api-key-here"
   ```

### RAG Configuration

Sistem RAG (Retrieval Augmented Generation) sudah dikonfigurasi untuk:

- Pencarian berbasis keyword
- Similarity scoring
- Context building
- Knowledge gap detection

## 📊 Analytics & Monitoring

### Dashboard Admin

Akses `/admin` untuk melihat:

- Statistik chat real-time
- Volume percakapan
- Celah pengetahuan
- Kualitas respons
- Distribusi kategori

### Health Check

```bash
# Cek status AI service
curl http://localhost:3001/health/ai

# Cek status lengkap sistem
curl http://localhost:3001/health/status
```

## 🗃️ Struktur Database

```sql
-- Tabel utama
- users (pengguna dan admin)
- knowledge_entries (basis pengetahuan medis)
- chat_sessions (sesi percakapan)
- chat_messages (pesan chat)
- query_matches (analitik pencarian)
- knowledge_gaps (celah pengetahuan)
```

## 📁 Struktur Proyek

```
├── server/
│   ├── lib/
│   │   ├── ai-service-manager.ts     # Manajemen AI service
│   │   ├── rag-service.ts           # RAG implementation
│   │   ├── whatsapp-service.ts      # WhatsApp integration
│   │   └── stats-service.ts         # Analytics service
│   ├── routes/
│   │   ├── chat.ts                  # Chat endpoints
│   │   ├── stats.ts                 # Analytics endpoints
│   │   └── whatsapp.ts              # WhatsApp endpoints
│   └── index.ts                     # Server utama
├── src/
│   ├── components/
│   │   ├── chat/                    # Komponen chat
│   │   └── admin/                   # Komponen admin
│   ├── pages/
│   │   ├── ChatPage.tsx             # Halaman chat
│   │   └── admin/                   # Halaman admin
│   └── contexts/                    # React contexts
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── seed.ts                     # Data seed Indonesia
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect repository ke Vercel
2. Set environment variables di Vercel dashboard
3. Deploy otomatis saat push

### Manual Deployment

```bash
npm run build
npm start
```

### Docker (Coming Soon)

```bash
docker-compose up -d
```

## 🔐 Keamanan

- Rate limiting untuk API
- JWT authentication
- Input validation
- SQL injection protection
- XSS protection dengan Helmet

## 📝 API Documentation

### Chat API

```bash
POST /api/chat
{
  "message": "saya merasa sakit kepala",
  "sessionId": "session_123"
}
```

### Stats API

```bash
GET /api/stats/dashboard
GET /api/stats/chat-volume
GET /api/stats/knowledge-gaps
```

### WhatsApp API

```bash
POST /api/whatsapp/initialize
GET /api/whatsapp/status
```

## 🧪 Testing

```bash
# Test AI service
npm run test:ai

# Test health check
npm run health:check

# Test stats service
npm run stats:demo
```

## 🔄 Maintenance

### Update Knowledge Base

1. Akses `/admin/knowledge`
2. Tambah/edit entri pengetahuan
3. Verifikasi oleh tenaga medis
4. Publish ke sistem

### Monitor Performance

- Gunakan dashboard analitik
- Monitor logs aplikasi
- Cek health endpoints
- Review knowledge gaps

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - lihat file LICENSE untuk detail.

## 🆘 Support

Untuk pertanyaan atau masalah, buat issue di repository ini atau hubungi tim support.

## 🚀 Roadmap

- [ ] Mobile app native
- [ ] Voice input/output
- [ ] Multiple language support
- [ ] EHR integration
- [ ] Appointment scheduling
- [ ] Video consultation

---

**Disclaimer**: Sistem ini hanya memberikan informasi medis umum dan bukan pengganti konsultasi medis profesional.
