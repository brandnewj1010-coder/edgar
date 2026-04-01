import type { VercelRequest, VercelResponse } from "@vercel/node";

/** USD 1당 KRW (참고용 시세) */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const dunamu = await fetch(
      "https://quotation-api-cdn.dunamu.com/v1/forex/recent?codes=FRX.KRWUSD",
      { headers: { Accept: "application/json" } },
    );

    if (dunamu.ok) {
      const data = (await dunamu.json()) as unknown;
      const rows = Array.isArray(data)
        ? data
        : (data as { data?: unknown[] })?.data;
      const row = Array.isArray(rows)
        ? (rows[0] as Record<string, unknown> | undefined)
        : undefined;
      const bp =
        row && typeof (row as { basePrice?: unknown }).basePrice === "number"
          ? (row as { basePrice: number }).basePrice
          : null;
      if (bp && bp > 100 && bp < 10000) {
        res.status(200).json({
          krwPerUsd: bp,
          source: "dunamu",
          asOf: new Date().toISOString(),
        });
        return;
      }
    }

    const er = await fetch(
      "https://api.exchangerate.host/latest?base=USD&symbols=KRW",
      { headers: { Accept: "application/json" } },
    );
    if (er.ok) {
      const j = (await er.json()) as {
        rates?: { KRW?: number };
        success?: boolean;
      };
      const krw = j.rates?.KRW;
      if (typeof krw === "number" && krw > 100) {
        res.status(200).json({
          krwPerUsd: krw,
          source: "exchangerate.host",
          asOf: new Date().toISOString(),
        });
        return;
      }
    }

    res.status(502).json({ error: "환율을 가져오지 못했습니다." });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[fx]", message);
    res.status(500).json({ error: "환율 조회 오류", detail: message });
  }
}
