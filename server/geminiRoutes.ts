import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  generateStructuredJson,
  generateStructuredJsonAll,
  getLlmStatus,
  RECONCILE_SCHEMA,
  RAG_SCHEMA,
  TRANSLATE_SCHEMA,
} from './llmProvider.js';
import { filterCitations, sanitizeSummaryPayload } from './knowledgeUtils.js';
import {
  buildRagPromptBody,
  normalizeRagPayload,
} from './importRoutes.js';

function requireLlm(_req: Request, res: Response, next: NextFunction) {
  if (!getLlmStatus().configured) {
    res.status(503).json({
      message:
        '未配置可用 LLM。请在 .env.local 设置 DASHSCOPE_API_KEY（百炼 Qwen）、HUNYUAN_API_KEY（腾讯混元）或 GEMINI_API_KEY。',
    });
    return;
  }
  next();
}

export function createGeminiRouter() {
  const router = Router();

  router.get('/status', (_req, res) => {
    res.json(getLlmStatus());
  });

  router.use(requireLlm);

  router.post('/translate', async (req, res) => {
    try {
      const { medicalTerm, value } = req.body as { medicalTerm?: string; value?: string };
      if (!medicalTerm || !value) {
        res.status(400).json({ message: 'medicalTerm and value are required.' });
        return;
      }

      const prompt = `You are a professional, user-friendly medical interpreter.
  Translate the following medical test result into warm, plain spoken "family language" (说人话) for a patient who is worried but doesn't want to go to the hospital unnecessarily.
  
  CRITICAL ASSESSMENT:
  Identify if this abnormality is likely:
  1. "transient" (一过性/暂时性波动): e.g., caused by short-term factors like eating too salty last night (昨晚吃咸了), high-sodium meal, staying up late (熬夜), dehydration, temporary stress, or intensive exercise. Let them know it's a transient trigger and how they can verify it.
  2. "persistent" (持续性/病理性特征): e.g., structural, metabolic, chronic, or genetic deviation that requires formal clinical checkup (需要定期医院复查).
  
  Provide realistic, honest evidence-based context.
  
  Medical Term: ${medicalTerm}
  Value: ${value}
  
  Return the result leading in Chinese (简体中文) in JSON format with keys: title, familyExplanation, actionableSteps (array of 3 strings), severity (low|medium|high), nature (transient|persistent), natureExplanation, abnormalReason.`;

      const { data, config } = await generateStructuredJson(prompt, TRANSLATE_SCHEMA);
      res.json({ ...data, provider: config.provider, model: config.model });
    } catch (error) {
      console.error('[gemini/translate]', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Translation failed.' });
    }
  });

  router.post('/reconcile', async (req, res) => {
    try {
      const { medicalAdvise, userHabit } = req.body as { medicalAdvise?: string; userHabit?: string };
      if (!medicalAdvise || !userHabit) {
        res.status(400).json({ message: 'medicalAdvise and userHabit are required.' });
        return;
      }

      const prompt = `You are a health strategist. A doctor recommended "${medicalAdvise}", but the user prefers to keep their habit of "${userHabit}" for specific reasons (e.g., focus, schedule).
  Create a "Reconciled Strategy" that minimizes biological risk while respecting the user's lifestyle.
  Then, break this strategy down into 3 quantifiable metrics for a daily log.
  
  Medical Advice: ${medicalAdvise}
  User Constraint: ${userHabit}
  
  Return JSON in Chinese (简体中文) with keys: medicalNecessity, userConstraint, reconciledStrategy, quantifiableMetrics (array of {label,target,unit}).`;

      const { data, config } = await generateStructuredJson(prompt, RECONCILE_SCHEMA);
      res.json({ ...data, provider: config.provider, model: config.model });
    } catch (error) {
      console.error('[gemini/reconcile]', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Reconciliation failed.' });
    }
  });

  router.post('/interpret-rag', async (req, res) => {
    if (process.env.RAG_ENABLED === 'false') {
      res.status(503).json({ message: 'RAG interpretation is disabled (RAG_ENABLED=false).' });
      return;
    }

    try {
      const {
        observations = [],
        redFlags = [],
        medicalTerm,
        value,
        knowledgeContext,
        chunkIds = [],
        careLevel,
      } = req.body as {
        observations?: Array<{
          canonicalId?: string | null;
          standardName: string;
          value?: string | null;
          unit?: string;
          abnormalFlag?: string | null;
          reportDate?: string;
        }>;
        redFlags?: Array<{ ruleId: string; severity: string; title: string; message: string }>;
        medicalTerm?: string;
        value?: string;
        knowledgeContext?: string;
        chunkIds?: string[];
        careLevel?: string;
      };

      if (!knowledgeContext?.trim()) {
        res.status(400).json({ message: 'knowledgeContext is required (client-side retrieval).' });
        return;
      }

      const prompt = buildRagPromptBody({
        observations,
        redFlags,
        medicalTerm,
        value,
        knowledgeContext,
        careLevel,
      });

      const { data, config } = await generateStructuredJson(prompt, RAG_SCHEMA);
      const normalized = normalizeRagPayload(data, careLevel);
      const sanitized = sanitizeSummaryPayload(normalized as Record<string, unknown>);
      const citations = filterCitations(sanitized.citations, chunkIds ?? []);
      res.json({
        ...sanitized,
        citations,
        chunkIds,
        ragEnabled: true,
        provider: config.provider,
        model: config.model,
      });
    } catch (error) {
      console.error('[gemini/interpret-rag]', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'RAG interpretation failed.' });
    }
  });

  router.post('/interpret-rag-multi', async (req, res) => {
    if (process.env.RAG_ENABLED === 'false') {
      res.status(503).json({ message: 'RAG interpretation is disabled (RAG_ENABLED=false).' });
      return;
    }

    try {
      const body = req.body as Parameters<typeof buildRagPromptBody>[0] & {
        knowledgeContext?: string;
        chunkIds?: string[];
        careLevel?: string;
      };

      if (!body.knowledgeContext?.trim()) {
        res.status(400).json({ message: 'knowledgeContext is required (client-side retrieval).' });
        return;
      }

      const prompt = buildRagPromptBody(body);
      const results = await generateStructuredJsonAll(prompt, RAG_SCHEMA);

      const mapped = results.map(({ data, config, error }) => {
        if (error) {
          return { provider: config.provider, model: config.model, label: config.label, error };
        }
        const normalized = normalizeRagPayload(data, body.careLevel);
        const sanitized = sanitizeSummaryPayload(normalized as Record<string, unknown>);
        const citations = filterCitations(sanitized.citations, body.chunkIds ?? []);
        return {
          ...sanitized,
          citations,
          chunkIds: body.chunkIds ?? [],
          ragEnabled: true,
          provider: config.provider,
          model: config.model,
          label: config.label,
        };
      });

      const successful = mapped.filter((m) => !('error' in m && m.error));
      if (!successful.length) {
        res.status(502).json({
          message: '所有已配置模型均解读失败',
          results: mapped,
        });
        return;
      }

      res.json({
        primary: successful[0],
        alternatives: mapped.slice(1),
        all: mapped,
      });
    } catch (error) {
      console.error('[gemini/interpret-rag-multi]', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Multi RAG failed.' });
    }
  });

  return router;
}
