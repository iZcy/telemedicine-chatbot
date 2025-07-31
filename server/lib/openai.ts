// server/lib/openai.ts - Enhanced with retry logic
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

  // 🛡️ Use enhanced retry logic for chat responses
  const result = await aiServiceManager.generateResponse(
    messages,
    {
      temperature: 0.7,
      maxTokens: 500
    },
    {
      maxRetries: 3, // More retries for important chat responses
      baseDelay: 2000, // Longer base delay for chat
      maxDelay: 15000, // Allow longer delays for chat
      backoffMultiplier: 2
    }
  );

  // Log which provider was used for monitoring
  console.log(`Chat response generated using: ${result.provider}`);
  if (result.error) {
    console.error("AI Service errors:", result.error);
    if (result.attempts) {
      console.log(`Total attempts made: ${result.attempts}`);
    }
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

  // 🛡️ Use retry logic for symptom extraction with shorter config
  const result = await aiServiceManager.generateResponse(
    messages,
    {
      temperature: 0.1,
      maxTokens: 100
    },
    {
      maxRetries: 2, // Fewer retries for symptom extraction
      baseDelay: 1000, // Shorter delays
      maxDelay: 5000,
      backoffMultiplier: 2
    }
  );

  try {
    const symptoms = JSON.parse(result.response);
    console.log(`Symptoms extracted using: ${result.provider}`);
    if (result.attempts && result.attempts > 1) {
      console.log(`Symptom extraction took ${result.attempts} attempts`);
    }
    return Array.isArray(symptoms) ? symptoms : [];
  } catch (parseError) {
    console.error("Failed to parse symptoms JSON:", parseError);
    console.error("Raw response:", result.response);

    // If parsing failed but we got a response, try to extract symptoms manually
    if (result.response && !result.error) {
      console.log("Attempting manual symptom extraction from response");
      return extractSymptomsManually(result.response);
    }

    return [];
  }
}

// 🔧 NEW: Manual symptom extraction fallback
function extractSymptomsManually(response: string): string[] {
  const symptoms: string[] = [];

  // Common symptom keywords in Indonesian
  const symptomKeywords = [
    "sakit kepala",
    "demam",
    "batuk",
    "pilek",
    "mual",
    "muntah",
    "diare",
    "pusing",
    "lemas",
    "sesak napas",
    "nyeri dada",
    "sakit perut",
    "gatal",
    "bengkak",
    "kelelahan",
    "insomnia"
  ];

  // Look for symptoms in the response text
  const lowerResponse = response.toLowerCase();

  for (const symptom of symptomKeywords) {
    if (lowerResponse.includes(symptom)) {
      symptoms.push(symptom);
    }
  }

  // Also try to extract from common phrases
  const matches = lowerResponse.match(/"([^"]+)"/g);
  if (matches) {
    matches.forEach((match) => {
      const cleaned = match.replace(/"/g, "").trim();
      if (cleaned.length > 2 && cleaned.length < 50) {
        symptoms.push(cleaned);
      }
    });
  }

  console.log(`Manual extraction found: ${symptoms.length} symptoms`);
  return [...new Set(symptoms)]; // Remove duplicates
}

// 🧪 NEW: Test functions for debugging
export async function testChatResponseRetry(
  testMessage: string = "saya sakit kepala"
): Promise<{
  success: boolean;
  response?: string;
  error?: string;
  attempts: number;
  duration: number;
}> {
  const startTime = Date.now();

  try {
    const response = await generateChatResponse(
      testMessage,
      "Tidak ada basis pengetahuan khusus.",
      "",
      { symptoms: [], conversationStage: "assessment" }
    );

    return {
      success: true,
      response: response.substring(0, 200) + "...", // Truncate for logging
      attempts: 1, // This would need to be tracked in the actual implementation
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      attempts: 3, // Assume max attempts on failure
      duration: Date.now() - startTime
    };
  }
}

export async function testSymptomExtractionRetry(
  testMessage: string = "saya merasa sakit kepala dan demam"
): Promise<{
  success: boolean;
  symptoms?: string[];
  error?: string;
  attempts: number;
  duration: number;
}> {
  const startTime = Date.now();

  try {
    const symptoms = await extractSymptoms(testMessage);

    return {
      success: true,
      symptoms,
      attempts: 1, // This would need to be tracked in the actual implementation
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      attempts: 2, // Assume max attempts on failure for symptom extraction
      duration: Date.now() - startTime
    };
  }
}
