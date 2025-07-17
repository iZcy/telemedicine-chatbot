// src/components/chat/WaitingIndicator.tsx
import { useWaitingMessages } from '@/hooks/useWaitingMessages';
import { Loader2, Sparkles } from 'lucide-react';

export default function WaitingIndicator() {
  const { displayText, isTyping, isFading } = useWaitingMessages(true);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg bg-purple-50 max-w-[80%] transition-all duration-300 ${isFading ? 'opacity-50' : 'opacity-100'
      }`}>
      <div className="flex-shrink-0 text-purple-600">
        <Sparkles className="h-5 w-5" />
      </div>

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Loader2 className="h-4 w-4 animate-spin text-purple-600 flex-shrink-0" />

        {/* Typing text with cursor */}
        <div className="relative">
          <span className={`text-sm text-gray-700 transition-opacity duration-300 ${isFading ? 'opacity-50' : 'opacity-100'
            }`}>
            {displayText}
          </span>

          {/* Typing cursor */}
          {isTyping && (
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-purple-600 animate-pulse"></span>
          )}
        </div>
      </div>

      {/* Animated dots */}
      <div className="flex space-x-1 flex-shrink-0">
        <div
          className={`w-1 h-1 bg-purple-400 rounded-full animate-bounce transition-opacity duration-300 ${isFading ? 'opacity-50' : 'opacity-100'
            }`}
          style={{ animationDelay: '0ms' }}
        ></div>
        <div
          className={`w-1 h-1 bg-purple-400 rounded-full animate-bounce transition-opacity duration-300 ${isFading ? 'opacity-50' : 'opacity-100'
            }`}
          style={{ animationDelay: '150ms' }}
        ></div>
        <div
          className={`w-1 h-1 bg-purple-400 rounded-full animate-bounce transition-opacity duration-300 ${isFading ? 'opacity-50' : 'opacity-100'
            }`}
          style={{ animationDelay: '300ms' }}
        ></div>
      </div>
    </div>
  );
}