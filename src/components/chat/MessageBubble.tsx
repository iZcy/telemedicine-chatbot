// src/components/chat/MessageBubble.tsx
import { AlertTriangle, BookOpen, Tag } from 'lucide-react';

interface MessageBubbleProps {
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

export default function MessageBubble({ content, sender, timestamp, sources }: MessageBubbleProps) {
  if (sender === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-blue-600 text-white p-3 rounded-lg">
          <p className="text-sm whitespace-pre-wrap">{content}</p>
          <p className="text-xs opacity-70 mt-1">
            {timestamp.toLocaleTimeString('id-ID')}
          </p>
        </div>
      </div>
    );
  }

  // Bot message - clean and simple formatting
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] bg-gray-100 text-gray-900 p-3 rounded-lg">
        <div className="space-y-2">
          {formatBotMessage(content)}
        </div>

        {/* Sources Section */}
        {sources && sources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="flex items-center mb-2">
              <BookOpen className="h-3 w-3 text-gray-500 mr-1" />
              <span className="text-xs text-gray-500 font-medium">
                Sumber referensi:
              </span>
            </div>
            <div className="space-y-1">
              {sources.slice(0, 3).map((source, index) => (
                <div key={index} className="flex items-center text-xs text-gray-600">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 flex-shrink-0"></div>
                  <span className="flex-1">{source.title}</span>
                  <div className="flex items-center ml-2">
                    <Tag className="h-3 w-3 mr-1" />
                    <span className="text-blue-600 capitalize">{source.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs opacity-70 text-gray-600 mt-2">
          {timestamp.toLocaleTimeString('id-ID')}
        </p>
      </div>
    </div>
  );
}

function formatBotMessage(content: string) {
  // Split content into sections
  const sections = content.split(/\n\s*\n/).filter(section => section.trim());

  return sections.map((section, index) => {
    const trimmed = section.trim();

    // Check for emergency warnings
    if (isEmergencyWarning(trimmed)) {
      return (
        <div key={index} className="bg-red-50 border-l-4 border-red-400 p-3 my-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">
              {cleanWarningText(trimmed)}
            </p>
          </div>
        </div>
      );
    }

    // Check for numbered lists
    if (hasNumberedList(trimmed)) {
      return (
        <div key={index}>
          {formatNumberedSection(trimmed)}
        </div>
      );
    }

    // Check for bullet points
    if (hasBulletPoints(trimmed)) {
      return (
        <div key={index}>
          {formatBulletSection(trimmed)}
        </div>
      );
    }

    // Regular paragraph
    return (
      <p key={index} className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
        {trimmed}
      </p>
    );
  });
}

function isEmergencyWarning(text: string): boolean {
  const emergencyKeywords = [
    'segera cari bantuan medis',
    'panggil layanan darurat',
    'layanan darurat',
    'darurat medis',
    'gejala parah',
    'mendadak parah',
    'segera ke rumah sakit',
    'hubungi dokter segera'
  ];
  return emergencyKeywords.some(keyword =>
    text.toLowerCase().includes(keyword)
  );
}

function cleanWarningText(text: string): string {
  return text.replace(/^[⚠️🚨🔴]*\s*/, '').replace(/[⚠️🚨🔴]*\s*$/, '');
}

function hasNumberedList(text: string): boolean {
  // Check for patterns like "1. something 2. something else"
  return /\d+\.\s+.+?(?:\s+\d+\.\s+|\s*$)/.test(text);
}

function hasBulletPoints(text: string): boolean {
  const lines = text.split('\n');
  return lines.some(line => /^\s*[•\-\*]\s+/.test(line));
}

function formatNumberedSection(text: string): JSX.Element[] {
  const elements: JSX.Element[] = [];

  // Split by numbered items but keep the text before first number
  const parts = text.split(/(?=\d+\.\s)/);

  parts.forEach((part, index) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    if (/^\d+\.\s/.test(trimmed)) {
      // This is a numbered item
      const number = trimmed.match(/^(\d+)\.\s/)![1];
      const content = trimmed.replace(/^\d+\.\s*/, '');

      elements.push(
        <div key={`item-${index}`} className="flex items-start gap-3 my-2">
          <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
            {number}
          </span>
          <span className="text-sm text-gray-800 leading-relaxed">
            {content}
          </span>
        </div>
      );
    } else {
      // This is intro text
      elements.push(
        <p key={`intro-${index}`} className="text-sm text-gray-800 mb-2">
          {trimmed}
        </p>
      );
    }
  });

  return elements;
}

function formatBulletSection(text: string): JSX.Element[] {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (/^[•\-\*]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[•\-\*]\s*/, '');
      elements.push(
        <div key={index} className="flex items-start gap-2 my-1">
          <span className="text-blue-500 text-sm font-bold mt-1">•</span>
          <span className="text-sm text-gray-800 leading-relaxed">
            {content}
          </span>
        </div>
      );
    } else {
      elements.push(
        <p key={index} className="text-sm text-gray-800 mb-2">
          {trimmed}
        </p>
      );
    }
  });

  return elements;
}