import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveDartCorp } from "./dart.js";

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const dartKey = process.env.DART_API_KEY?.trim();
  if (!dartKey) {
    res.status(500).json({ error: "DART_API_KEY가 설정되지 않았습니다." });
    return;
  }

  let body: { query?: string };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "잘못된 JSON 본문입니다." });
    return;
  }

  const query = String(body.query ?? "").trim();
  if (!query) {
    res.status(400).json({ error: "검색어를 입력하세요." });
    return;
  }

  try {
    const corp = await resolveDartCorp(query, dartKey);
    if (!corp) {
      res.status(404).json({
        error: "상장사를 찾지 못했습니다. 6자리 종목코드(예: 005930)로 다시 검색해 보세요.",
      });
      return;
    }
    res.status(200).json(corp);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(502).json({ error: msg });
  }
}
