import type { Language } from "@/context/i18n";

const CACHE_PREFIX = "dynamic_translation_v3";
const MAX_CHUNK_LENGTH = 450;

type QueueItem = {
  text: string;
  language: Exclude<Language, "en">;
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
};

let translationQueue: QueueItem[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function hashText(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getCacheKey(text: string, language: Language) {
  return `${CACHE_PREFIX}:${language}:${hashText(text)}`;
}

function readCachedTranslation(text: string, language: Language) {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(getCacheKey(text, language));
  } catch {
    return null;
  }
}

function writeCachedTranslation(text: string, language: Language, translated: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getCacheKey(text, language), translated);
  } catch {}
}

function chunkText(text: string) {
  const chunks: string[] = [];
  const paragraphs = text.split(/(\n+)/);

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      chunks.push(paragraph);
      continue;
    }

    let remaining = paragraph;
    while (remaining.length > MAX_CHUNK_LENGTH) {
      const splitAt =
        remaining.lastIndexOf(".", MAX_CHUNK_LENGTH) ||
        remaining.lastIndexOf(",", MAX_CHUNK_LENGTH) ||
        remaining.lastIndexOf(" ", MAX_CHUNK_LENGTH) ||
        MAX_CHUNK_LENGTH;

      chunks.push(remaining.slice(0, splitAt + 1));
      remaining = remaining.slice(splitAt + 1);
    }

    if (remaining) chunks.push(remaining);
  }

  return chunks;
}

async function flushTranslationQueue() {
  const queue = translationQueue;
  translationQueue = [];
  flushTimer = null;

  const groups = queue.reduce((acc, item) => {
    acc[item.language] = acc[item.language] ?? [];
    acc[item.language].push(item);
    return acc;
  }, {} as Record<Exclude<Language, "en">, QueueItem[]>);

  await Promise.all(
    Object.entries(groups).map(async ([language, items]) => {
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language,
            texts: items.map((item) => item.text),
          }),
        });

        if (!response.ok) throw new Error("Translation request failed");

        const data = await response.json();
        const translations = Array.isArray(data?.translations) ? data.translations : [];

        items.forEach((item, index) => {
          const translated = translations[index];
          item.resolve(typeof translated === "string" ? translated : item.text);
        });
      } catch (error) {
        items.forEach((item) => item.reject(error));
      }
    })
  );
}

function enqueueTranslation(text: string, language: Exclude<Language, "en">) {
  return new Promise<string>((resolve, reject) => {
    translationQueue.push({ text, language, resolve, reject });

    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        void flushTranslationQueue();
      }, 25);
    }
  });
}

async function translateChunk(chunk: string, language: Exclude<Language, "en">) {
  if (!chunk.trim()) return chunk;
  return enqueueTranslation(chunk, language);
}

export async function translateDynamicText(text: string, language: Language) {
  if (!text || language === "en") return text;

  const cached = readCachedTranslation(text, language);
  if (cached) return cached;

  const chunks = chunkText(text);
  const translatedChunks = await Promise.all(chunks.map((chunk) => translateChunk(chunk, language)));
  const translated = translatedChunks.join("");

  writeCachedTranslation(text, language, translated);
  return translated;
}

export const translateDynamicCourseText = translateDynamicText;
