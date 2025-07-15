// src/lib/rate-limit.ts
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export async function rateLimit(
  identifier: string,
  limit: number = 10,
  window: number = 60
) {
  const key = `rate_limit:${identifier}`;
  const current = await redis.get(key);

  if (current === null) {
    await redis.setex(key, window, 1);
    return { success: true, remaining: limit - 1 };
  }

  const currentCount = parseInt(current);
  if (currentCount >= limit) {
    return { success: false, remaining: 0 };
  }

  await redis.incr(key);
  return { success: true, remaining: limit - currentCount - 1 };
}
