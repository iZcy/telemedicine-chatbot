// server/lib/ai-service-manager.ts
import axios from "axios";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIServiceConfig {
  temperature: number;
  maxTokens: number;
  timeout?: number;
}

class AIServiceManager {
  private deepSeekApiUrl = "https://openrouter.ai/api/v1/chat/completions";
  private defaultTimeout = 30000; // 30 seconds

  constructor() {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY is required");
    }
  }

  private async callDeepSeek(
    messages: ChatMessage[],
    config: AIServiceConfig
  ): Promise<string> {
    const response = await axios.post(
      this.deepSeekApiUrl,
      {
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: false
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: config.timeout || this.defaultTimeout
      }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from DeepSeek");
    }
    return content;
  }

  async generateResponse(
    messages: ChatMessage[],
    config: AIServiceConfig = { temperature: 0.7, maxTokens: 500 }
  ): Promise<{
    response: string;
    provider: "deepseek";
    error?: string;
  }> {
    try {
      console.log("🤖 Calling DeepSeek API...");
      const response = await this.callDeepSeek(messages, config);
      console.log("✅ DeepSeek API call successful");
      return { response, provider: "deepseek" };
    } catch (error) {
      console.error("❌ DeepSeek API failed:", error);

      const fallbackMessage = this.getFallbackMessage(error);
      return {
        response: fallbackMessage,
        provider: "deepseek",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private getFallbackMessage(error: any): string {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("rate limit")) {
      return "Saya sedang mengalami beban tinggi. Silakan coba lagi dalam beberapa menit.";
    }

    if (errorMessage.includes("timeout")) {
      return "Permintaan memakan waktu lebih lama dari yang diharapkan. Silakan coba lagi dengan pertanyaan yang lebih singkat.";
    }

    return "Saya sedang mengalami gangguan teknis. Silakan coba lagi nanti atau hubungi dukungan jika masalah berlanjut.";
  }

  // Health check method
  async healthCheck(): Promise<{
    deepseek: { status: "ok" | "error"; latency?: number };
  }> {
    const testMessage: ChatMessage[] = [{ role: "user", content: "Halo" }];

    const results: {
      deepseek: { status: "ok" | "error"; latency?: number };
    } = {
      deepseek: { status: "error" }
    };

    try {
      const start = Date.now();
      await this.callDeepSeek(testMessage, { temperature: 0.1, maxTokens: 10 });
      results.deepseek = { status: "ok", latency: Date.now() - start };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("DeepSeek health check failed:", errorMessage);
    }

    return results;
  }
}

export const aiServiceManager = new AIServiceManager();
