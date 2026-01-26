import { Redis } from "@upstash/redis";

// Initialize Redis client
// In production, uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
// For local dev, falls back to in-memory storage
let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redis = new Redis({ url, token });
    return redis;
  }

  return null;
}

// Archive key
export const ARCHIVE_KEY = "recipe_archive";
