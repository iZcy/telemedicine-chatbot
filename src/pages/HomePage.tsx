// src/pages/HomePage.tsx
import { Link } from 'react-router-dom';
import { MessageSquare, Shield, Clock, Users, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">MediBot Indonesia</span>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/chat"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mulai Chat
              </Link>
              <Link
                to="/admin"
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Asisten <span className="text-blue-600">Kesehatan AI</span> Indonesia
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Dapatkan jawaban instan untuk pertanyaan kesehatan Anda dengan chatbot cerdas kami.
            Tersedia 24/7 untuk memberikan informasi medis umum dan panduan kesehatan.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <Link
              to="/chat"
              className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 transition-colors"
            >
              Mulai Konsultasi
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Tersedia 24/7</h3>
              <p className="mt-2 text-base text-gray-500">
                Dapatkan panduan medis kapan saja, siang atau malam.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Aman & Privat</h3>
              <p className="mt-2 text-base text-gray-500">
                Informasi kesehatan Anda dilindungi dan bersifat rahasia.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">AI DeepSeek</h3>
              <p className="mt-2 text-base text-gray-500">
                Didukung oleh teknologi AI DeepSeek yang canggih.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Pengetahuan Ahli</h3>
              <p className="mt-2 text-base text-gray-500">
                Didukung oleh profesional medis dan teknologi AI.
              </p>
            </div>
          </div>
        </div>

        {/* Technology Info */}
        <div className="mt-20 bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Teknologi Terdepan</h2>
            <p className="text-gray-600">
              Sistem kami menggunakan teknologi terdepan untuk memberikan respons yang akurat dan relevan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">DeepSeek AI</h3>
              <p className="text-sm text-gray-600">
                Model AI generasi terbaru untuk pemahaman konteks yang lebih baik
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">RAG System</h3>
              <p className="text-sm text-gray-600">
                Sistem pencarian yang cerdas untuk informasi medis yang akurat
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Basis Pengetahuan</h3>
              <p className="text-sm text-gray-600">
                Dikurasi dan diverifikasi oleh tenaga medis profesional
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp Integration */}
        <div className="mt-20 bg-green-50 rounded-lg p-8">
          <div className="text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-500 text-white mx-auto mb-4">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Integrasi WhatsApp</h2>
            <p className="text-gray-600 mb-6">
              Akses asisten medis langsung melalui WhatsApp untuk kemudahan yang lebih besar
            </p>
            <div className="bg-white rounded-lg p-4 inline-block">
              <p className="text-sm text-gray-600">
                Hubungi kami di WhatsApp: <span className="font-semibold text-green-600">+62 XXX-XXXX-XXXX</span>
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-20 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Shield className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Disclaimer Medis Penting
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Chatbot ini memberikan informasi kesehatan umum dan bukan pengganti saran medis profesional,
                  diagnosis, atau pengobatan. Selalu konsultasikan dengan tenaga kesehatan yang berkualifikasi untuk
                  masalah medis. Dalam keadaan darurat, segera hubungi layanan darurat atau ke rumah sakit terdekat.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}