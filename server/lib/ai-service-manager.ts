// server/lib/ai-service-manager.ts
import OpenAI from "openai";
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
  private openai: OpenAI;
  private deepSeekApiUrl = "https://openrouter.ai/api/v1/chat/completions";
  private defaultTimeout = 30000; // 30 seconds

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  private async callOpenAI(
    messages: ChatMessage[],
    config: AIServiceConfig
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      // config.maxTokens <= 100 ? "gpt-3.5-turbo" : "gpt-4",
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error("Empty response from OpenAI");
    }
    return response;
  }

  private async callDeepSeek(
    messages: ChatMessage[],
    config: AIServiceConfig
  ): Promise<string> {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("DeepSeek API key not configured");
    }

    const response = await axios.post(
      this.deepSeekApiUrl,
      {
        model: "deepseek/deepseek-chat-v3-0324:free",
        // "deepseek/deepseek-r1:free",
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:3000",
          "X-Title": "Telemedicine Chatbot"
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
    provider: "openai" | "deepseek" | "fallback";
    error?: string;
  }> {
    // Try OpenAI first
    try {
      // throw new Error("Simulated OpenAI failure for testing fallback"); // Simulate failure for testing
      console.log("🤖 Attempting OpenAI API call...");
      const response = await this.callOpenAI(messages, config);
      console.log("✅ OpenAI API call successful");
      return { response, provider: "openai" };
    } catch (openaiError) {
      console.error("❌ OpenAI API failed:", openaiError);

      // Try DeepSeek as fallback
      try {
        console.log("🔄 Falling back to DeepSeek API...");
        const response = await this.callDeepSeek(messages, config);
        console.log("✅ DeepSeek API call successful");
        return { response, provider: "deepseek" };
      } catch (deepSeekError) {
        console.error("❌ DeepSeek API also failed:", deepSeekError);

        const fallbackMessage = this.getFallbackMessage(
          openaiError,
          deepSeekError
        );
        return {
          response: fallbackMessage,
          provider: "fallback",
          error: `OpenAI: ${openaiError.message}, DeepSeek: ${deepSeekError.message}`
        };
      }
    }
  }

  private getFallbackMessage(openaiError: any, deepSeekError: any): string {
    // Check for specific error types to provide better user feedback
    if (
      openaiError.message?.includes("rate limit") ||
      deepSeekError.message?.includes("rate limit")
    ) {
      return "I'm currently experiencing high demand. Please try again in a few minutes.";
    }

    if (
      openaiError.message?.includes("timeout") ||
      deepSeekError.message?.includes("timeout")
    ) {
      return "The request is taking longer than expected. Please try again with a shorter question.";
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return "I'm experiencing technical difficulties with my AI service and no backup is configured. Please try again later or contact support.";
    }

    return "I'm experiencing technical difficulties with both my primary and backup AI services. Please try again later or contact support if the issue persists.";
  }

  // Health check method
  async healthCheck(): Promise<{
    openai: { status: "ok" | "error"; latency?: number };
    deepseek: { status: "ok" | "error"; latency?: number };
  }> {
    const testMessage: ChatMessage[] = [{ role: "user", content: "Hello" }];

    const results = {
      openai: { status: "error" as const, latency: undefined },
      deepseek: { status: "error" as const, latency: undefined }
    };

    // Test OpenAI
    try {
      const start = Date.now();
      await this.callOpenAI(testMessage, { temperature: 0.1, maxTokens: 10 });
      results.openai = { status: "ok", latency: Date.now() - start };
    } catch (error) {
      console.error("OpenAI health check failed:", error);
    }

    // Test DeepSeek
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const start = Date.now();
        await this.callDeepSeek(testMessage, {
          temperature: 0.1,
          maxTokens: 10
        });
        results.deepseek = { status: "ok", latency: Date.now() - start };
      } catch (error) {
        console.error("DeepSeek health check failed:", error);
      }
    }

    return results;
  }
}

export const aiServiceManager = new AIServiceManager();
