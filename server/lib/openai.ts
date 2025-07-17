// server/lib/openai.ts
import { aiServiceManager } from "./ai-service-manager";

export async function generateChatResponse(
  userMessage: string,
  knowledgeContext: string,
  conversationHistory: string,
  chatContext: any
): Promise<string> {
  const systemPrompt = `Anda adalah asisten medis chatbot untuk platform telemedicine. 

PANDUAN PENTING:
- Gunakan basis pengetahuan yang disediakan untuk menjawab pertanyaan
- Selalu sertakan disclaimer medis yang tepat
- Sarankan konsultasi dengan profesional kesehatan untuk gejala serius
- Jangan pernah memberikan diagnosis definitif
- Bersikap empati dan membantu
- Jika gejala tampak serius, rekomendasikan perhatian medis segera
- Jawab dalam teks biasa tanpa format markdown untuk kompatibilitas yang lebih baik

BASIS PENGETAHUAN:
${knowledgeContext}

RIWAYAT PERCAKAPAN:
${conversationHistory}

KONTEKS SAAT INI:
Gejala yang disebutkan pengguna: ${
    chatContext.symptoms?.join(", ") || "Belum ada"
  }
Tahap percakapan: ${chatContext.conversationStage || "salam"}

Ingat untuk:
1. Merespons berdasarkan basis pengetahuan yang diberikan
2. Menambahkan disclaimer medis yang tepat
3. Bersikap percakapan dan empati
4. Sarankan eskalasi jika gejala mengkhawatirkan
5. Gunakan bahasa Indonesia yang baik dan mudah dipahami`;

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
        'Ekstrak gejala medis dari pesan pengguna. Hanya kembalikan array JSON dari gejala, tidak ada teks lain. Contoh: ["sakit kepala", "demam", "mual"]'
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
