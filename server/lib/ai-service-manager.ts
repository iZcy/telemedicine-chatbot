// server/lib/ai-service-manager.ts - Enhanced with retry logic
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

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

class AIServiceManager {
  private deepSeekApiUrl = "https://openrouter.ai/api/v1/chat/completions";
  private defaultTimeout = 30000; // 30 seconds
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
  };

  constructor() {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY is required");
    }
  }

  // 🔄 NEW: Sleep utility for delays
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 🔄 NEW: Calculate retry delay with exponential backoff
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    const delay =
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  // 🔄 NEW: Determine if error is retryable
  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const code = error.code;

      // Retry on network errors
      if (
        code === "ECONNRESET" ||
        code === "ENOTFOUND" ||
        code === "ECONNREFUSED"
      ) {
        return true;
      }

      // Retry on specific HTTP status codes
      if (status) {
        return (
          status === 429 || // Rate limit
          status === 502 || // Bad gateway
          status === 503 || // Service unavailable
          status === 504 || // Gateway timeout
          status >= 520 // Cloudflare errors
        );
      }
    }

    // Retry on timeout errors
    if (error.message?.includes("timeout")) {
      return true;
    }

    return false;
  }

  // 🔄 NEW: Get error-specific delay
  private getErrorSpecificDelay(error: any): number {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const retryAfter = error.response?.headers["retry-after"];

      // Honor Retry-After header if present
      if (retryAfter) {
        const retryAfterMs = parseInt(retryAfter) * 1000;
        return Math.min(retryAfterMs, this.defaultRetryConfig.maxDelay);
      }

      // Longer delay for rate limits
      if (status === 429) {
        return 5000; // 5 seconds for rate limits
      }
    }

    return 0; // Use default exponential backoff
  }

  // 🛡️ Enhanced DeepSeek API call with retry logic
  private async callDeepSeek(
    messages: ChatMessage[],
    config: AIServiceConfig,
    retryConfig: RetryConfig = this.defaultRetryConfig
  ): Promise<string> {
    let lastError: any;

    for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
      try {
        console.log(
          `🤖 DeepSeek API call attempt ${attempt}/${
            retryConfig.maxRetries + 1
          }`
        );

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

        console.log(`✅ DeepSeek API call successful on attempt ${attempt}`);
        return content;
      } catch (error) {
        lastError = error;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.error(
          `❌ DeepSeek API attempt ${attempt} failed:`,
          errorMessage
        );

        // Don't retry on the last attempt
        if (attempt > retryConfig.maxRetries) {
          break;
        }

        // Don't retry if error is not retryable
        if (!this.isRetryableError(error)) {
          console.log(`⚠️ Non-retryable error, stopping attempts`);
          break;
        }

        // Calculate delay
        const errorSpecificDelay = this.getErrorSpecificDelay(error);
        const exponentialDelay = this.calculateRetryDelay(attempt, retryConfig);
        const delay = errorSpecificDelay || exponentialDelay;

        console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt + 1})`);
        await this.sleep(delay);
      }
    }

    // All attempts failed
    throw lastError;
  }

  // 🛡️ Enhanced generateResponse with retry
  async generateResponse(
    messages: ChatMessage[],
    config: AIServiceConfig = { temperature: 0.7, maxTokens: 500 },
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<{
    response: string;
    provider: "deepseek";
    error?: string;
    attempts?: number;
  }> {
    const retryConfig = { ...this.defaultRetryConfig, ...customRetryConfig };
    const startTime = Date.now();

    try {
      console.log("🤖 Starting DeepSeek API call with retry logic...");
      const response = await this.callDeepSeek(messages, config, retryConfig);

      const duration = Date.now() - startTime;
      console.log(`✅ DeepSeek API call completed in ${duration}ms`);

      return { response, provider: "deepseek" };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ DeepSeek API failed after ${duration}ms:`, error);

      const fallbackMessage = this.getFallbackMessage(error);
      return {
        response: fallbackMessage,
        provider: "deepseek",
        error: error instanceof Error ? error.message : String(error),
        attempts: retryConfig.maxRetries + 1
      };
    }
  }

  // 🛡️ Enhanced fallback messages with more context
  private getFallbackMessage(error: any): string {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Rate limit specific message
    if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      return "Saya sedang mengalami batasan penggunaan API. Mohon tunggu beberapa menit dan coba lagi. Jika mendesak, silakan hubungi tenaga medis langsung.";
    }

    // Timeout specific message
    if (errorMessage.includes("timeout")) {
      return "Koneksi ke sistem AI memakan waktu lebih lama dari biasanya. Silakan coba lagi dengan pertanyaan yang lebih ringkas, atau coba beberapa saat lagi.";
    }

    // Network/connection errors
    if (
      errorMessage.includes("ECONNRESET") ||
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("network")
    ) {
      return "Terjadi masalah koneksi jaringan. Silakan periksa koneksi internet Anda dan coba lagi.";
    }

    // API quota/billing issues
    if (
      errorMessage.includes("quota") ||
      errorMessage.includes("billing") ||
      errorMessage.includes("payment")
    ) {
      return "Layanan AI sedang mengalami masalah teknis terkait akun. Tim teknis telah diberitahu dan sedang menangani masalah ini.";
    }

    // Generic fallback
    return "Sistem AI sedang mengalami gangguan sementara. Untuk informasi medis darurat, silakan hubungi 119 atau konsultasi langsung dengan tenaga kesehatan. Coba lagi dalam beberapa menit.";
  }

  // 🛡️ Enhanced health check with retry
  async healthCheck(): Promise<{
    deepseek: {
      status: "ok" | "error";
      latency?: number;
      attempts?: number;
      lastError?: string;
    };
  }> {
    const testMessage: ChatMessage[] = [{ role: "user", content: "Hi" }];
    const startTime = Date.now();

    const results: {
      deepseek: {
        status: "ok" | "error";
        latency?: number;
        attempts?: number;
        lastError?: string;
      };
    } = {
      deepseek: { status: "error" }
    };

    try {
      await this.callDeepSeek(
        testMessage,
        { temperature: 0.1, maxTokens: 10 },
        { maxRetries: 1, baseDelay: 1000, maxDelay: 3000, backoffMultiplier: 2 } // Faster health check
      );

      const latency = Date.now() - startTime;
      results.deepseek = { status: "ok", latency, attempts: 1 };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error("DeepSeek health check failed:", errorMessage);
      results.deepseek = {
        status: "error",
        latency,
        attempts: 2, // Health check uses max 1 retry
        lastError: errorMessage
      };
    }

    return results;
  }

  // 🔧 NEW: Method to test API with custom retry settings
  async testAPIWithRetry(
    message: string = "Test message",
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<{
    success: boolean;
    response?: string;
    error?: string;
    totalAttempts: number;
    totalTime: number;
  }> {
    const startTime = Date.now();
    const retryConfig = { ...this.defaultRetryConfig, ...customRetryConfig };

    try {
      const result = await this.generateResponse(
        [{ role: "user", content: message }],
        { temperature: 0.1, maxTokens: 50 },
        customRetryConfig
      );

      return {
        success: !result.error,
        response: result.response,
        error: result.error,
        totalAttempts: result.attempts || 1,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        totalAttempts: retryConfig.maxRetries + 1,
        totalTime: Date.now() - startTime
      };
    }
  }

  // 🔧 NEW: Get current retry configuration
  getRetryConfig(): RetryConfig {
    return { ...this.defaultRetryConfig };
  }

  // 🔧 NEW: Update retry configuration
  updateRetryConfig(newConfig: Partial<RetryConfig>): void {
    this.defaultRetryConfig = { ...this.defaultRetryConfig, ...newConfig };
    console.log("🔧 Updated retry configuration:", this.defaultRetryConfig);
  }
}

export const aiServiceManager = new AIServiceManager();
