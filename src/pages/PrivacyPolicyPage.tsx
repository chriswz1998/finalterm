import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const EFFECTIVE_DATE = '2025-06-09';
const CONTACT_EMAIL = 'privacy@example.com';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A]">
      <header className="border-b border-[#1A1A1A]/10 px-4 py-4 max-w-2xl mx-auto">
        <Link to="/" className="text-[10px] font-mono text-neutral-400 hover:text-neutral-600">
          ← Health Link
        </Link>
        <div className="flex items-center gap-2 mt-3">
          <Shield className="w-5 h-5 text-emerald-800" />
          <h1 className="text-2xl font-serif font-semibold tracking-tight">隐私政策</h1>
        </div>
        <p className="text-[11px] text-neutral-500 mt-2 font-mono">生效日期：{EFFECTIVE_DATE}</p>
      </header>

      <article className="max-w-2xl mx-auto px-4 py-8 space-y-8 text-sm font-serif leading-relaxed text-neutral-700">
        <section className="space-y-3">
          <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-neutral-500">
            引言
          </h2>
          <p>
            Health Link（「本应用」）由个人开发者运营，用于帮助用户整理体检报告、理解检验指标，并提供基于知识库与
            AI 的「说人话」参考解读。我们重视您的隐私，本政策说明我们如何收集、使用、存储与保护您的信息。
          </p>
          <p className="text-neutral-500 text-[12px]">
            本应用<strong>不提供</strong>医疗诊断、处方或治疗服务。详见各页面免责声明。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-neutral-500">
            一、我们收集的信息
          </h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>
              <strong>健康与检验数据</strong>：您主动上传或导入的体检报告内容（指标名称、数值、参考范围、异常标记等）。
            </li>
            <li>
              <strong>档案与偏好</strong>：家庭成员昵称、用药记录、备注等您在本应用内填写或导入的内容。
            </li>
            <li>
              <strong>微信身份标识（小程序）</strong>：若您使用微信小程序，经您授权后我们会通过{' '}
              <code className="text-[11px] bg-neutral-100 px-1">wx.login</code> 获取微信{' '}
              <strong>openid</strong>，用于识别账号、隔离您的档案数据。我们不收集您的微信密码。
            </li>
            <li>
              <strong>设备与日志</strong>：为保障服务稳定，服务器可能记录访问时间、接口路径、错误信息等基础日志，不含报告正文。
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-neutral-500">
            二、信息如何使用
          </h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>在本地或服务端结构化展示您的体检指标与趋势。</li>
            <li>结合内置知识库（L0–L6）与规则引擎，生成健康管理参考与照护等级提示。</li>
            <li>
              仅在您<strong>主动触发</strong> AI 解读、Agent 追问或 OCR 识别时，将相关指标文本或图片经服务端转发至
              第三方大模型服务（如阿里云百炼 / 通义千问）进行处理。
            </li>
            <li>微信小程序场景下，使用 openid 关联您的会话与档案（二期服务端存储）。</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-neutral-500">
            三、存储位置与期限
          </h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>
              <strong>Web / App 浏览器端</strong>：部分档案默认存储于您设备浏览器的 localStorage，清除缓存或卸载可能导致数据丢失。
            </li>
            <li>
              <strong>服务端</strong>：AI 解读请求在处理完成后不长期保存报告全文；微信登录 token 有时效（默认 7 天）。
            </li>
            <li>
              <strong>日志</strong>：访问日志保留不超过 90 天（生产环境建议配置）。
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-neutral-500">
            四、第三方共享
          </h2>
          <p>我们不出售您的个人信息。仅在以下情况可能共享必要数据：</p>
          <ul className="space-y-2 list-disc pl-5">
            <li>
              <strong>AI 模型服务商</strong>（如阿里云 DashScope）：传输您主动提交的指标文本或报告图片，用于生成解读结果。
            </li>
            <li>
              <strong>腾讯微信</strong>：小程序登录时与微信服务器交换 login code，获取 openid。
            </li>
            <li>
              <strong>云基础设施</strong>：托管 API 与静态页面的云服务商（如阿里云 / 腾讯云），受服务协议约束。
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-neutral-500">
            五、您的权利
          </h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>在应用内删除或导出您导入的档案数据（以产品功能为准）。</li>
            <li>拒绝或撤回 AI 解读授权：不勾选同意即可不使用 AI 功能；PDF 本地解析仍可独立使用。</li>
            <li>注销小程序账号数据：请联系 {CONTACT_EMAIL}，我们将在合理期限内删除与您 openid 关联的服务端数据。</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-neutral-500">
            六、未成年人
          </h2>
          <p>
            本应用主要面向成年人管理个人及家庭健康档案。若您未满 14 周岁，请在监护人同意与指导下使用，并由监护人阅读本政策。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-neutral-500">
            七、政策更新
          </h2>
          <p>
            我们可能适时更新本政策，更新版本将发布于本页面并修改生效日期。重大变更时，我们将在应用内显著位置提示。
          </p>
        </section>

        <section className="space-y-3 pb-12">
          <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-neutral-500">
            八、联系我们
          </h2>
          <p>
            隐私相关问题请联系：
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-800 underline ml-1">
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="text-[11px] text-neutral-400">
            微信小程序后台「用户隐私保护指引」请填写与本页一致的收集项，并填入本页 URL：
            <code className="block mt-1 bg-neutral-100 px-2 py-1 font-mono text-[10px]">
              https://your-domain.com/privacy
            </code>
          </p>
        </section>
      </article>
    </div>
  );
}
