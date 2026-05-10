import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * 배포 진단용: GET /api/health
 * 키 값은 절대 노출하지 않습니다.
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

  const openai = process.env.OPENAI_API_KEY;
  const openaiKeyConfigured = Boolean(openai && String(openai).trim().length > 0);
  const dart = process.env.DART_API_KEY;
  const dartKeyConfigured = Boolean(dart && String(dart).trim().length > 0);

  res.status(200).json({
    ok: true,
    openaiKeyConfigured,
    dartKeyConfigured,
    hint: [
      openaiKeyConfigured
        ? "OPENAI_API_KEY OK."
        : "Add OPENAI_API_KEY in Vercel → Environment Variables → Redeploy.",
      dartKeyConfigured
        ? "DART_API_KEY OK (Korea filing tables will attach)."
        : "Optional: DART_API_KEY from opendart.fss.or.kr for real FS + executive/employee tables.",
    ].join(" "),
  });
}
