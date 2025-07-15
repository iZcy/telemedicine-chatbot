import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return (
      completion.choices[0].message.content ||
      "I'm sorry, I couldn't generate a response. Please try again."
    );
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "I'm experiencing technical difficulties. Please try again later or contact support if the issue persists.";
  }
}

export async function extractSymptoms(userMessage: string): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            'Extract medical symptoms from the user\'s message. Return only a JSON array of symptoms, no other text. Example: ["headache", "fever", "nausea"]'
        },
        { role: "user", content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 100
    });

    const response = completion.choices[0].message.content || "[]";
    return JSON.parse(response);
  } catch (error) {
    console.error("Symptom extraction error:", error);
    return [];
  }
}
