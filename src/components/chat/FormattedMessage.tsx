// src/components/chat/FormattedMessage.tsx
import { AlertTriangle } from 'lucide-react';
import { FormattedContent } from '@/lib/response-formatter';

interface FormattedMessageProps {
  content: FormattedContent[];
  timestamp: Date;
}

export default function FormattedMessage({ content, timestamp }: FormattedMessageProps) {
  return (
    <div className="max-w-[80%] bg-gray-100 text-gray-900 p-3 rounded-lg">
      <div className="space-y-3">
        {content.map((item, index) => (
          <div key={index}>
            {item.type === 'paragraph' && (
              <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                {item.content as string}
              </p>
            )}

            {item.type === 'heading' && (
              <h3 className={`font-semibold text-gray-900 mb-2 ${item.level === 1 ? 'text-base' :
                item.level === 2 ? 'text-sm' : 'text-sm'
                }`}>
                {item.content as string}
              </h3>
            )}

            {item.type === 'list' && (
              <div className="space-y-2">
                {(item.content as string[]).map((listItem, listIndex) => (
                  <div key={listIndex} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                      {listIndex + 1}
                    </span>
                    <span className="text-gray-800 leading-relaxed">
                      {listItem}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {item.type === 'warning' && (
              <div className="bg-red-50 border-l-4 border-red-400 p-3 my-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 leading-relaxed font-medium">
                    {item.content as string}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs opacity-70 text-gray-600 mt-2">
        {timestamp.toLocaleTimeString()}
      </p>
    </div>
  );
}
