import { Router, type NextFunction, type Request, type Response } from 'express';
import { VISION_EXTRACT_PROMPT } from './prompts/examImportPrompts.js';

const DASHSCOPE_BASE =
  process.env.DASHSCOPE_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1';

function requireDashScopeKey(_req: Request, res: Response, next: NextFunction) {
  if (!process.env.DASHSCOPE_API_KEY) {
    res.status(503).json({
      message:
        'DASHSCOPE_API_KEY is not configured. See README「OCR / 文档解析测试」获取百炼密钥。',
    });
    return;
  }
  next();
}

/** PoC: scanned report image → structured text via Qwen-VL (百炼). Production tables → Document Mind. */
export function createDocumentRouter() {
  const router = Router();
  router.use(requireDashScopeKey);

  router.post('/vision-parse', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', prompt } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        prompt?: string;
      };

      if (!imageBase64?.trim()) {
        res.status(400).json({ message: 'imageBase64 is required.' });
        return;
      }

      const model = process.env.DASHSCOPE_VISION_MODEL ?? 'qwen-vl-plus';
      const userPrompt = prompt ?? VISION_EXTRACT_PROMPT;

      const response = await fetch(`${DASHSCOPE_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };

      if (!response.ok) {
        res.status(response.status).json({
          message: payload.error?.message ?? `DashScope request failed (${response.status})`,
        });
        return;
      }

      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        res.status(502).json({ message: 'Empty response from DashScope vision model.' });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = { rawText: content };
      }

      res.json({
        provider: 'dashscope',
        model,
        result: parsed,
        note: 'PoC only — production OCR/tables should use 阿里云文档智能 Document Mind or 腾讯云 OCR.',
      });
    } catch (error) {
      console.error('[document/vision-parse]', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Vision parse failed.' });
    }
  });

  return router;
}
