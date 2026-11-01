import { NextResponse } from "next/server";
import { getCoreCards } from "@/lib/hs/cards";
import type { HsCardDef } from "@/lib/hs/types";

function fallbackCard(prompt: string): HsCardDef {
  const arts = getCoreCards().map((c) => c.art);
  const art = arts[Math.floor(Math.random() * arts.length)] ?? "/cards/chovanec.jpg";
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúýžščřďťňů]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const cost = 1 + (prompt.length % 7);
  return {
    id: `gen-${slug || "karta"}-${Date.now().toString(36)}`,
    name: (prompt.trim().slice(0, 28) || "NOVÝ CHOVANEC").toUpperCase(),
    type: "minion",
    cost,
    attack: Math.max(1, cost - 1),
    health: Math.max(1, cost),
    text: `Vygenerováno z: „${prompt.trim().slice(0, 80)}“`,
    keywords: cost >= 4 ? ["taunt"] : cost <= 2 ? ["charge"] : [],
    rarity: "rare",
    art,
    source: "generated",
  };
}

async function geminiGenerate(prompt: string, apiKey: string): Promise<HsCardDef> {
  const system = `Jsi designér karet pro českou Hearthstone-like hru ChovanecStone.
Vrať POUZE JSON objekt bez markdownu s poli:
id (string kebab), name (CAPS), type (minion|spell|weapon|secret), cost (0-10),
attack (number optional), health (number optional), text (česky max 120 znaků),
keywords (array z: charge,taunt,divine_shield,windfury,stealth,battlecry,deathrattle,secret),
rarity (common|rare|epic|legendary), secretTrigger optional (on_attacked|on_spell|on_minion_played).
Balancuj kartu. Humor wordplay -chovanec vítán.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${system}\n\nPrompt hráče: ${prompt}` }],
        },
      ],
      generationConfig: { temperature: 0.9 },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    "";
  const jsonText = text.replace(/^```json\s*|\s*```$/g, "").trim();
  const parsed = JSON.parse(jsonText) as Partial<HsCardDef>;
  const base = fallbackCard(prompt);
  return {
    ...base,
    ...parsed,
    id: String(parsed.id ?? base.id).slice(0, 48),
    name: String(parsed.name ?? base.name).toUpperCase(),
    type: (parsed.type as HsCardDef["type"]) ?? "minion",
    cost: Math.max(0, Math.min(10, Number(parsed.cost ?? base.cost))),
    attack:
      parsed.attack !== undefined
        ? Math.max(0, Math.min(12, Number(parsed.attack)))
        : base.attack,
    health:
      parsed.health !== undefined
        ? Math.max(0, Math.min(12, Number(parsed.health)))
        : base.health,
    text: String(parsed.text ?? base.text).slice(0, 160),
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : base.keywords,
    rarity: (parsed.rarity as HsCardDef["rarity"]) ?? "rare",
    art: base.art,
    source: "generated",
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { prompt?: string } | null;
  const prompt = body?.prompt?.trim() ?? "";
  if (prompt.length < 3) {
    return NextResponse.json(
      { error: "Napiš delší prompt (min. 3 znaky)." },
      { status: 400 },
    );
  }

  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  try {
    const card = key ? await geminiGenerate(prompt, key) : fallbackCard(prompt);
    return NextResponse.json({
      card,
      mocked: !key,
      message: key
        ? "Návrh z AI — zkontroluj a schvál."
        : "Bez GEMINI_API_KEY — lokální návrh. Na server doplň klíč.",
    });
  } catch (e) {
    const card = fallbackCard(prompt);
    return NextResponse.json({
      card,
      mocked: true,
      message: `AI selhala (${e instanceof Error ? e.message : "error"}), fallback návrh.`,
    });
  }
}
