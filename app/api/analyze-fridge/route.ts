import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { imageBase64, mediaType, groceryList } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const groceries = groceryList || "Молоко, Яйца, Хлеб, Масло сливочное, Сыр, Творог, Йогурт, Сметана, Кефир, Курица, Фарш, Помидоры, Огурцы, Лук, Картофель, Морковь, Бананы, Яблоки, Макароны, Рис, Гречка";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
            { type: "text", text: "Ты ИИ-ассистент в приложении доставки продуктов Перекрёсток. Пользователь сфотографировал холодильник.\n\n1. Определи все продукты на фото (name, status: ok/low/empty, note)\n2. Сравни с обычным списком покупок: " + groceries + "\n3. Составь список рекомендаций что заказать с ценами\n\nОтветь ИСКЛЮЧИТЕЛЬНО валидным JSON без markdown-блоков:\n{\"found\":[{\"name\":\"Молоко\",\"status\":\"ok\",\"note\":\"есть\"}],\"toOrder\":[{\"name\":\"Яйца\",\"reason\":\"Не обнаружены\",\"priority\":\"high\",\"price\":119}],\"summary\":\"Описание\"}\n\nЦены: Молоко~109, Яйца~119, Хлеб~49, Масло~139, Сыр~249, Творог~89, Йогурт~79, Сметана~79, Кефир~69, Курица~329, Фарш~299, Помидоры~169, Огурцы~89, Лук~39, Картофель~49, Морковь~39, Бананы~119, Яблоки~149, Макароны~79, Рис~89, Гречка~99." }
          ]
        }]
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: "Anthropic API error: " + response.status, details: errText }, { status: 502 });
    }

    const data = await response.json();
    const rawText = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");

    if (!rawText) {
      return NextResponse.json({ error: "Empty response from AI" }, { status: 502 });
    }

    const clean = rawText.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const i = clean.indexOf("{");
      const j = clean.lastIndexOf("}");
      if (i >= 0 && j > i) {
        parsed = JSON.parse(clean.substring(i, j + 1));
      } else {
        return NextResponse.json({ error: "AI response is not valid JSON", raw: clean.substring(0, 200) }, { status: 502 });
      }
    }

    parsed.found = parsed.found || [];
    parsed.toOrder = parsed.toOrder || [];
    parsed.summary = parsed.summary || "";

    return NextResponse.json(parsed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
