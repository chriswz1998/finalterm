/**
 * 办公小浣熊 OpenClaw Office API（xiaohuanxiong.com）
 * 用于多份报告标准化完成后的跨报告分析、高级图表、PPT 产物。
 * 与 SenseNova 对话 LLM API 无关 — 使用 RACCOON_API_TOKEN（OpenClaw JWT）。
 */

import { randomUUID } from 'crypto';
import { buildReportsCsv, type RaccoonReportPayload } from './exportReportsCsv.js';

const HEALTH_ANALYSIS_PROMPT = `你是一名健康数据分析师。请基于上传的 CSV 体检指标表进行分析。

要求：
1. 若有多份报告（不同 report_date），对比同一 canonical_id / standard_name 的数值变化趋势
2. 重点列出 is_abnormal=true 的指标，说明是偏高还是偏低
3. 用通俗中文总结，不要给出具体用药或诊断结论
4. 尽量生成 1-2 张可视化图表（趋势折线图、异常项对比图等）
5. 如有条件，输出可下载的分析报告（PPT 或文档）
6. 输出结构：先给 3-5 条要点，再给详细分析

数据字段说明：report_date=体检日期, standard_name=指标名, value=数值, is_abnormal=是否异常`;

export class RaccoonAPIError extends Error {
  constructor(
    public code: number | string,
    message: string,
  ) {
    super(`办公小浣熊 API 错误 [${code}]: ${message}`);
  }
}

export interface RaccoonArtifact {
  filename: string;
  url: string;
  timestamp?: string;
}

export interface RaccoonAnalysisResult {
  ok: boolean;
  sessionId?: string;
  text?: string;
  images?: string[];
  artifacts?: RaccoonArtifact[];
  reportCount?: number;
  error?: string;
  source: 'raccoon';
}

function raccoonHost(): string {
  return (process.env.RACCOON_API_HOST ?? 'https://xiaohuanxiong.com').replace(/\/$/, '');
}

function raccoonToken(): string {
  return process.env.RACCOON_API_TOKEN?.trim() ?? '';
}

export function isRaccoonConfigured(): boolean {
  const token = raccoonToken();
  if (!token) return false;
  const PLACEHOLDER = [/你的/i, /placeholder/i, /replace[-_]?me/i, /^xxx$/i];
  return !PLACEHOLDER.some((p) => p.test(token));
}

export function getRaccoonStatus() {
  return {
    configured: isRaccoonConfigured(),
    host: raccoonHost(),
    enabled: process.env.ENABLE_RACCOON_ANALYSIS !== 'false',
  };
}

class RaccoonClient {
  private host = raccoonHost();
  private token = raccoonToken();

  private jsonHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  private uploadHeaders() {
    return { Authorization: `Bearer ${this.token}` };
  }

  private async request<T = Record<string, unknown>>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.host}${path}`, {
      method,
      headers: this.jsonHeaders(),
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new RaccoonAPIError(res.status, text.slice(0, 300));
    let parsed: { code?: number; message?: string; data?: T };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      throw new RaccoonAPIError(res.status, text.slice(0, 300));
    }
    if (parsed.code !== 0) {
      throw new RaccoonAPIError(parsed.code ?? 'unknown', parsed.message ?? 'unknown error');
    }
    return (parsed.data ?? {}) as T;
  }

  async createSession(name: string): Promise<{ id: string }> {
    return this.request('POST', '/api/open/office/v2/sessions', { name });
  }

  async uploadCsv(csvContent: string, filename = 'health_reports.csv'): Promise<number> {
    const batchId = randomUUID();
    const url = `${this.host}/api/open/office/v2/sessions/default_session/${batchId}/files`;
    const form = new FormData();
    form.append('file', new Blob([csvContent], { type: 'text/csv' }), filename);

    const res = await fetch(url, {
      method: 'POST',
      headers: this.uploadHeaders(),
      body: form,
    });
    const text = await res.text();
    if (!res.ok) throw new RaccoonAPIError(res.status, text.slice(0, 300));

    const body = JSON.parse(text) as {
      data?: { file_list?: Array<{ id: number }> };
    };
    const fileId = body.data?.file_list?.[0]?.id;
    if (fileId == null) throw new RaccoonAPIError(0, '上传文件失败: 返回空 file_list');
    return fileId;
  }

  async chat(
    sessionId: string,
    content: string,
    uploadFileIds?: number[],
  ): Promise<{ text: string; images: string[]; sessionId: string; turnId: string }> {
    const url = `${this.host}/api/open/office/v2/sessions/${sessionId}/chat/conversations`;
    const payload: Record<string, unknown> = {
      content,
      verbose: true,
      enable_web_search: false,
      deep_think: false,
      temperature: 0.7,
      message_uuid: randomUUID(),
      edit: 0,
    };
    if (uploadFileIds?.length) payload.upload_file_id = uploadFileIds;

    const res = await fetch(url, {
      method: 'POST',
      headers: this.jsonHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new RaccoonAPIError(res.status, errText.slice(0, 300));
    }

    let text = '';
    const images: string[] = [];
    let imageBuffer = '';
    let currentStage = '';
    let outSessionId = sessionId;
    let turnId = '';

    const reader = res.body?.getReader();
    if (!reader) throw new RaccoonAPIError(0, '办公小浣熊返回空响应流');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim();
        if (jsonStr === '[DONE]') break;

        let obj: {
          status?: { code?: number; message?: string };
          stage?: string;
          data?: { delta?: string; session_id?: string; turn_id?: string };
        };
        try {
          obj = JSON.parse(jsonStr) as typeof obj;
        } catch {
          continue;
        }

        const statusCode = obj.status?.code ?? 0;
        if (statusCode !== 0) {
          throw new RaccoonAPIError(statusCode, obj.status?.message ?? 'stream error');
        }

        const stage = obj.stage ?? '';
        const delta = obj.data?.delta ?? '';
        if (obj.data?.session_id) outSessionId = obj.data.session_id;
        if (obj.data?.turn_id) turnId = obj.data.turn_id;
        if (!delta) continue;

        if (stage && stage !== currentStage) {
          if (currentStage === 'image' && imageBuffer) {
            images.push(imageBuffer);
            imageBuffer = '';
          }
          currentStage = stage;
        }

        if (currentStage === 'generate') text += delta;
        else if (currentStage === 'image') imageBuffer += delta;
      }
    }

    if (imageBuffer) images.push(imageBuffer);

    return { text, images, sessionId: outSessionId, turnId };
  }

  async getArtifacts(sessionId: string): Promise<RaccoonArtifact[]> {
    const data = await this.request<{ artifacts?: Array<Record<string, string>> }>(
      'GET',
      `/api/open/office/v2/sessions/${sessionId}/artifacts`,
    );
    return (data.artifacts ?? [])
      .filter((a) => a.s3_url)
      .map((a) => ({
        filename: a.filename ?? `artifact_${a.timestamp ?? 'unknown'}`,
        url: a.s3_url!,
        timestamp: a.timestamp,
      }));
  }
}

function buildPrompt(reports: RaccoonReportPayload[], memberName?: string): string {
  const dates = [...new Set(reports.map((r) => r.report_date ?? r.reportDate ?? '').filter(Boolean))].sort();
  const abnormalTotal = reports.reduce(
    (sum, r) => sum + (r.indicators?.filter((i) => i.is_abnormal).length ?? 0),
    0,
  );
  let header = `成员: ${memberName || '未命名'}\n报告份数: ${reports.length}\n`;
  header += `日期范围: ${dates.join(', ')}\n异常指标总数: ${abnormalTotal}\n\n`;
  return header + HEALTH_ANALYSIS_PROMPT;
}

function headlineFromText(text: string): string {
  const line = text.split('\n').map((l) => l.trim()).find(Boolean);
  return line ? line.replace(/^[-*#\d.\s]+/, '').slice(0, 80) : '跨报告健康数据分析';
}

export async function analyzeHealthReportsWithRaccoon(opts: {
  reports: RaccoonReportPayload[];
  memberName?: string;
}): Promise<RaccoonAnalysisResult> {
  if (!isRaccoonConfigured()) {
    return { ok: false, error: '未配置 RACCOON_API_HOST / RACCOON_API_TOKEN', source: 'raccoon' };
  }

  const okReports = opts.reports.filter((r) => r.ok !== false);
  if (!okReports.length) {
    return { ok: false, error: '没有有效报告可分析', source: 'raccoon' };
  }

  try {
    const client = new RaccoonClient();
    const csv = buildReportsCsv(okReports);
    const sessionName = `HealthLink-${opts.memberName || '用户'}-${okReports.length}份`;
    const session = await client.createSession(sessionName);
    const fileId = await client.uploadCsv(csv);
    const prompt = buildPrompt(okReports, opts.memberName);
    const chat = await client.chat(session.id, prompt, [fileId]);
    const artifacts = await client.getArtifacts(chat.sessionId);

    const analysisText = chat.text.trim();
    return {
      ok: true,
      source: 'raccoon',
      sessionId: chat.sessionId,
      text: analysisText,
      images: chat.images,
      artifacts,
      reportCount: okReports.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[raccoon/analyze]', msg);
    return { ok: false, error: msg, source: 'raccoon' };
  }
}

/** 将办公小浣熊文本结果映射为前端 BatchAnalysisResult 兼容字段 */
export function mapRaccoonToBatchAnalysis(result: RaccoonAnalysisResult) {
  const text = result.text ?? '';
  const bulletLines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[-*•\d]/.test(l))
    .map((l) => l.replace(/^[-*•\d.\s]+/, ''))
    .filter(Boolean);

  return {
    headline: headlineFromText(text),
    overallSummary: text,
    crossReportInsights: bulletLines.slice(0, 8),
    suggestedQuestions: [],
    disclaimer: '本分析由办公小浣熊生成，仅供健康管理参考，不能替代医生面诊与诊断。',
    source: 'raccoon' as const,
    provider: 'raccoon',
    label: '办公小浣熊 / OpenClaw',
    raccoonSessionId: result.sessionId,
    analysisText: text,
    images: result.images ?? [],
    artifacts: result.artifacts ?? [],
  };
}
