// src/pages/ChatPage.tsx - Fixed height and added back button
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ChatInterface from '@/components/chat/ChatInterface';

export default function ChatPage() {
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header with Back Button */}
      <div className="flex-shrink-0 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link
              to="/"
              className="flex items-center px-3 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Beranda
            </Link>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Medical Assistant Chatbot
            </h1>
            <p className="text-gray-600">
              Get instant answers to your health questions. Always consult healthcare professionals for serious concerns.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Interface - Takes remaining height */}
      <div className="flex-1 min-h-0 px-4 pb-4">
        <div className="max-w-4xl mx-auto h-full">
          <div className="mx-auto max-w-2xl h-full">
            <ChatInterface />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-500">
          <p>
            ⚠️ This chatbot provides general information only and is not a substitute for professional medical advice.
            In case of emergency, call emergency services immediately.
          </p>
        </div>
      </div>
    </div>
  );
}