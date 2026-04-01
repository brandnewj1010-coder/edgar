import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * 배포 진단용: 브라우저에서 GET /api/health 로 열어보면
 * 서버리스에 GEMINI_API_KEY가 주입되는지 여부만 확인합니다 (키 값은 절대 노출 안 함).
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  const geminiKeyConfigured = Boolean(key && String(key).trim().length > 0);

  res.status(200).json({
    ok: true,
    geminiKeyConfigured,
    hint: geminiKeyConfigured
      ? "GEMINI_API_KEY is present on this deployment."
      : "GEMINI_API_KEY is missing for serverless. Add it in Vercel → this project → Settings → Environment Variables → Production, then Redeploy.",
  });
}
