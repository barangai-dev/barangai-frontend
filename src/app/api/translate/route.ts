import { NextResponse } from "next/server";

type TranslationLanguage = "tl" | "ceb";

function isSupportedLanguage(value: unknown): value is TranslationLanguage {
  return value === "tl" || value === "ceb";
}

async function translateOne(text: string, language: TranslationLanguage) {
  if (!text.trim()) return text;

  const params = new URLSearchParams({
    client: "gtx",
    sl: "en",
    tl: language,
    dt: "t",
    q: text,
  });

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
    headers: { "User-Agent": "BarangAI/1.0" },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Translation service failed");

  const data = await response.json();
  return Array.isArray(data?.[0])
    ? data[0].map((part: unknown[]) => part?.[0] ?? "").join("")
    : text;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const language = body?.language;
    const texts: string[] = Array.isArray(body?.texts)
      ? body.texts.filter((value: unknown): value is string => typeof value === "string")
      : typeof body?.text === "string"
      ? [body.text]
      : [];

    if (!isSupportedLanguage(language)) {
      return NextResponse.json({ translations: texts, translatedText: texts[0] ?? "" });
    }

    const translations = await Promise.all(texts.map((text) => translateOne(text, language)));

    return NextResponse.json({
      translations,
      translatedText: translations[0] ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Unable to translate text" }, { status: 500 });
  }
}
