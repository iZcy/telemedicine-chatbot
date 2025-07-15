import ChatInterface from '@/components/chat/ChatInterface';

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Medical Assistant Chatbot
          </h1>
          <p className="text-gray-600">
            Get instant answers to your health questions. Always consult healthcare professionals for serious concerns.
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          <ChatInterface />
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            ⚠️ This chatbot provides general information only and is not a substitute for professional medical advice.
            In case of emergency, call emergency services immediately.
          </p>
        </div>
      </div>
    </div>
  );
}