// server/lib/openai.ts
import { aiServiceManager } from "./ai-service-manager";

export async function generateChatResponse(
  userMessage: string,
  knowledgeContext: string,
  conversationHistory: string,
  chatContext: any
): Promise<string> {
  const systemPrompt = `You are a medical assistant chatbot for a telemedicine platform. 

IMPORTANT GUIDELINES:
- Use the provided knowledge base to answer questions
- Always include appropriate medical disclaimers
- Suggest consulting healthcare providers for serious symptoms
- Never provide definitive diagnoses
- Be empathetic and helpful
- If symptoms seem serious, recommend immediate medical attention
- Respond in plain text without markdown formatting for better compatibility

KNOWLEDGE BASE:
${knowledgeContext}

CONVERSATION HISTORY:
${conversationHistory}

CURRENT CONTEXT:
User symptoms mentioned: ${chatContext.symptoms?.join(", ") || "None yet"}
Conversation stage: ${chatContext.conversationStage || "greeting"}

Remember to:
1. Respond based on the knowledge base provided
2. Add appropriate medical disclaimers
3. Be conversational and empathetic
4. Suggest escalation if symptoms are concerning`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userMessage }
  ];

  const result = await aiServiceManager.generateResponse(messages, {
    temperature: 0.7,
    maxTokens: 500
  });

  // Log which provider was used for monitoring
  console.log(`Chat response generated using: ${result.provider}`);
  if (result.error) {
    console.error("AI Service errors:", result.error);
  }

  return result.response;
}

export async function extractSymptoms(userMessage: string): Promise<string[]> {
  const messages = [
    {
      role: "system" as const,
      content:
        'Extract medical symptoms from the user\'s message. Return only a JSON array of symptoms, no other text. Example: ["headache", "fever", "nausea"]'
    },
    { role: "user" as const, content: userMessage }
  ];

  const result = await aiServiceManager.generateResponse(messages, {
    temperature: 0.1,
    maxTokens: 100
  });

  try {
    const symptoms = JSON.parse(result.response);
    console.log(`Symptoms extracted using: ${result.provider}`);
    return Array.isArray(symptoms) ? symptoms : [];
  } catch (parseError) {
    console.error("Failed to parse symptoms JSON:", parseError);
    console.error("Raw response:", result.response);
    return [];
  }
}
