// src/components/chat/ChatInterface.tsx
import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import WaitingIndicator from './WaitingIndicator';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<'openai' | 'deepseek'>('openai');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Welcome message
    setMessages([{
      id: '1',
      content: "Hello! I'm here to help you with your health questions.\n\nPlease remember that I provide general information only and you should consult with healthcare professionals for medical advice.\n\nHow can I assist you today?",
      sender: 'bot',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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
          sessionId,
          provider: aiProvider
        })
      });

      const data = await response.json();

      if (response.ok) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble responding right now. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Medical Assistant</h2>

          {/* AI Provider Toggle */}
          <div className="flex items-center gap-2 bg-blue-700 rounded-lg p-1">
            <button
              onClick={() => setAiProvider('openai')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${aiProvider === 'openai'
                ? 'bg-white text-blue-600'
                : 'text-blue-200 hover:text-white'
                }`}
              disabled={isLoading}
            >
              🧠 OpenAI
            </button>
            <button
              onClick={() => setAiProvider('deepseek')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${aiProvider === 'deepseek'
                ? 'bg-white text-blue-600'
                : 'text-blue-200 hover:text-white'
                }`}
              disabled={isLoading}
            >
              🔮 DeepSeek
            </button>
          </div>
        </div>
        <p className="text-sm opacity-90">
          Ask me about your health concerns • Powered by {aiProvider === 'openai' ? 'OpenAI' : 'DeepSeek'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            content={message.content}
            sender={message.sender}
            timestamp={message.timestamp}
          />
        ))}

        {/* Waiting Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <WaitingIndicator provider={aiProvider} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask ${aiProvider === 'openai' ? 'OpenAI' : 'DeepSeek'} about your health...`}
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            disabled={isLoading}
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
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>
            Using {aiProvider === 'openai' ? '🧠 OpenAI GPT-4' : '🔮 DeepSeek R1'}
          </span>
          {isLoading && (
            <span className="text-blue-600">
              {aiProvider === 'openai' ? 'OpenAI is thinking...' : 'DeepSeek is processing...'}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}