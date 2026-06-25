/**
 * Capture Demo screenshots for final project PDF materials.
 * Prerequisite: npm run dev (web :3000, api :3001)
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../output/final-project-materials/screenshots');
const BASE = process.env.DEMO_BASE_URL ?? 'http://localhost:3000';

const DEMO_MEMBER_ID = 'demo-member-screenshot';

async function seedMainAppDemoState(page) {
  await page.evaluate((memberId) => {
    const member = {
      id: memberId,
      name: '演示用户',
      relation: 'self',
      gender: 'female',
      createdAt: '2026-06-23T00:00:00.000Z',
    };
    localStorage.setItem('health-link:familyMembers', JSON.stringify([member]));
    localStorage.setItem('health-link:activeMemberId', memberId);
    localStorage.setItem(
      'health-link:memberArchives',
      JSON.stringify({
        [memberId]: {
          hasData: true,
          useDemoBaseline: true,
          userImports: [],
          userRemarks: 'Final project demo archive for PDF materials.',
        },
      }),
    );
    localStorage.setItem('health-link:dataConsent', 'true');
    localStorage.setItem('health-link:aiConsent', 'true');
  }, DEMO_MEMBER_ID);
}

const DEMO_SESSION = {
  id: 'demo-session-pdf',
  memberId: 'default',
  createdAt: '2026-06-23T10:00:00.000Z',
  updatedAt: '2026-06-23T10:05:00.000Z',
  fileName: 'demo-lab-report-2025.pdf',
  source: 'pdf_extract',
  observations: [
    {
      id: 'obs-ldl',
      canonicalId: 'ldl_c',
      standardName: 'LDL-C',
      originalName: '低密度脂蛋白胆固醇',
      value: '3.82',
      unit: 'mmol/L',
      referenceRange: '< 3.12',
      numericValue: 3.82,
      abnormalFlag: 'high',
      reportDate: '2025-02-28',
      provenance: { source: 'pdf_extract', sourcePage: 1 },
    },
    {
      id: 'obs-alt',
      canonicalId: 'alt',
      standardName: 'ALT',
      originalName: '丙氨酸氨基转移酶',
      value: '51.1',
      unit: 'U/L',
      referenceRange: '7.0～40.0',
      numericValue: 51.1,
      abnormalFlag: 'high',
      reportDate: '2025-02-28',
      provenance: { source: 'pdf_extract', sourcePage: 2 },
    },
    {
      id: 'obs-bmi',
      canonicalId: 'bmi',
      standardName: 'BMI',
      originalName: '体重指数',
      value: '24.88',
      unit: '',
      referenceRange: '18.5～23.9',
      numericValue: 24.88,
      abnormalFlag: 'high',
      reportDate: '2025-02-28',
      provenance: { source: 'pdf_extract', sourcePage: 1 },
    },
  ],
  redFlags: [
    {
      ruleId: 'ldl_persistent_elevated',
      severity: 'moderate',
      title: 'LDL-C 持续偏高',
      message: '低密度脂蛋白胆固醇高于参考范围，建议结合饮食与复查评估。',
      relatedIndicators: ['ldl_c'],
    },
  ],
  bootstrap: { totalCount: 3, abnormalCount: 3, riskLevel: 'medium', reportDate: '2025-02-28' },
  summary:
    '本次报告有 3 项指标标记异常，其中 LDL-C 与 ALT 偏高，可能与饮食、代谢或肝脏负荷有关。建议进一步由医生结合症状与复查综合评估，本解读不作诊断。',
  headline: '3 项异常需关注',
  followUpHint: '建议 3 个月内复查血脂与肝功能。',
  riskLevel: 'medium',
  careLevel: 'S2',
  summaryCitations: [
    { chunkId: 'l2:ldl_c:high:v1', title: 'LDL-C 偏高', excerpt: '可能与饮食、遗传或代谢因素有关' },
    { chunkId: 'l6:disclaimer:v1', title: '标准免责声明' },
  ],
  items: [
    {
      observationId: 'obs-ldl',
      standardName: 'LDL-C',
      value: '3.82',
      unit: 'mmol/L',
      plainExplanation: 'LDL 常被称为「坏胆固醇」，偏高意味着血管里携带胆固醇的颗粒可能增多。',
      whyAbnormal: '数值高于参考上限，可能与饮食、体重或代谢状态有关。',
      lifestyleTips: ['减少饱和脂肪', '增加膳食纤维', '规律运动'],
      severity: 'medium',
      nature: 'persistent',
      status: 'done',
      citations: [{ chunkId: 'l2:ldl_c:high:v1', title: 'LDL-C 偏高' }],
    },
    {
      observationId: 'obs-alt',
      standardName: 'ALT',
      value: '51.1',
      unit: 'U/L',
      plainExplanation: 'ALT 是反映肝细胞状态的酶，轻度升高常见于疲劳、饮酒或脂肪肝等情况。',
      whyAbnormal: '高于参考范围，建议结合其他肝功能和症状评估。',
      lifestyleTips: ['避免饮酒', '保证睡眠', '控制体重'],
      severity: 'medium',
      nature: 'transient',
      status: 'done',
      citations: [{ chunkId: 'l2:alt:high:v1', title: 'ALT 偏高' }],
    },
  ],
  chatMessages: [],
  aiConsentGranted: true,
  sync: { eligible: true },
  interpretStatus: 'done',
};

async function shot(page, name, url, opts = {}) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  if (opts.waitMs) await page.waitForTimeout(opts.waitMs);
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? true });
  console.log('saved', file);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });

  const page = await desktop.newPage();
  await shot(page, '08-onboarding-desktop.png', `${BASE}/onboarding`, { waitMs: 1200 });

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await seedMainAppDemoState(page);

  await shot(page, '01-agent-home-desktop.png', `${BASE}/agent`);
  await shot(page, '02-interpret-upload-desktop.png', `${BASE}/interpret`, { waitMs: 2000 });
  await shot(page, '05-dashboard-desktop.png', `${BASE}/status`, { waitMs: 2000 });
  await shot(page, '06-knowledge-page.png', `${BASE}/knowledge`, { waitMs: 1000 });

  await page.goto(`${BASE}/agent`, { waitUntil: 'networkidle' });
  const consent = page.locator('input[type="checkbox"]').first();
  if (await consent.count()) {
    await consent.check();
    await page.screenshot({
      path: path.join(OUT, '03-agent-consent-checked.png'),
      fullPage: true,
    });
    console.log('saved consent screenshot');
  }

  await page.evaluate(
    (session) => {
      localStorage.setItem('health-link:agent-sessions', JSON.stringify([session]));
    },
    DEMO_SESSION,
  );
  await shot(page, '04-agent-result-demo.png', `${BASE}/agent/result/demo-session-pdf`, {
    waitMs: 1500,
  });

  const mpage = await mobile.newPage();
  await mpage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await seedMainAppDemoState(mpage);
  await shot(mpage, '07-agent-home-mobile.png', `${BASE}/agent`);

  await browser.close();
  console.log('Done. Screenshots in', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
