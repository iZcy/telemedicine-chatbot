// src/components/chat/ChatInterface.tsx - Simplified without wait message
import { useState, useEffect, useRef } from 'react';
import { Send, Brain } from 'lucide-react';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  sources?: Array<{
    title: string;
    category: string;
    relevanceScore: number;
    matchType: string;
  }>;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Welcome message in Indonesian
    setMessages([{
      id: '1',
      content: "Halo! Saya adalah asisten medis yang siap membantu Anda dengan pertanyaan kesehatan.\n\nHarap diingat bahwa saya hanya memberikan informasi umum dan Anda harus berkonsultasi dengan profesional kesehatan untuk saran medis.\n\nBagaimana saya dapat membantu Anda hari ini?",
      sender: 'bot',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          sessionId
        })
      });

      const data = await response.json();

      if (response.ok) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'bot',
          timestamp: new Date(),
          sources: data.relevantSources || []
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Gagal mengirim pesan');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Maaf, saya mengalami kesulitan merespons sekarang. Silakan coba lagi.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Asisten Medis</h2>
          <div className="flex items-center gap-2 bg-blue-700 rounded-lg px-3 py-1">
            <Brain className="w-4 h-4" />
            <span className="text-xs font-medium">DeepSeek AI</span>
          </div>
        </div>
        <p className="text-sm opacity-90">
          Tanyakan tentang keluhan kesehatan Anda • Didukung oleh DeepSeek AI
        </p>
      </div>

      {/* Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            content={message.content}
            sender={message.sender}
            timestamp={message.timestamp}
            sources={message.sources}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] bg-gray-100 text-gray-900 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600">Sedang memproses...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom */}
      <div className="p-4 border-t flex-shrink-0">
        <form onSubmit={sendMessage} className="space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Tanyakan tentang kesehatan Anda..."
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              disabled={isLoading}
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {/* Status indicator */}
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Menggunakan DeepSeek AI untuk respons yang akurat</span>
            <span>{inputMessage.length}/1000</span>
          </div>
        </form>
      </div>
    </div>
  );
}