export interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: "USER" | "BOT";
  content: string;
  timestamp: Date;
  intentDetected?: string;
  confidence?: number;
}

export interface ChatSession {
  id: string;
  userId?: string;
  startedAt: Date;
  endedAt?: Date;
  status: "ACTIVE" | "ENDED" | "ESCALATED";
  context: Record<string, any>;
  messages?: ChatMessage[];
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  tags: string[];
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  medicalReviewed: boolean;
  requiresEscalation: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SearchResult {
  entry: KnowledgeEntry;
  relevanceScore: number;
}

export interface ChatContext {
  symptoms: string[];
  userInfo: Record<string, any>;
  conversationStage:
    | "greeting"
    | "assessment"
    | "recommendation"
    | "escalation";
  lastIntent?: string;
}
