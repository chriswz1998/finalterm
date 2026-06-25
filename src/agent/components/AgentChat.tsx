import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { agentChat, AgentApiError } from '@/src/agent/agentClient';
import { saveAgentSession } from '@/src/agent/agentSession';
import type { AgentChatMessage, AgentSession } from '@/src/agent/types';

const QUICK_PROMPTS = [
  '哪些指标最需要复查？',
  '饮食上要注意什么？',
  '需要马上去医院吗？',
];

interface Props {
  session: AgentSession;
  onClose: () => void;
  onUpdate: (s: AgentSession) => void;
}

export function AgentChat({ session, onClose, onUpdate }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messages = session.chatMessages;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: AgentChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    const pending: AgentSession = { ...session, chatMessages: nextMessages };
    onUpdate(pending);
    saveAgentSession(pending);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await agentChat({
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        observations: session.observations,
        reportSummary: session.summary,
        interpretedItems: session.items
          .filter((i) => i.status === 'done')
          .map((i) => ({ standardName: i.standardName, plainExplanation: i.plainExplanation })),
      });

      const assistantMsg: AgentChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        createdAt: new Date().toISOString(),
      };

      const updated: AgentSession = {
        ...pending,
        chatMessages: [...nextMessages, assistantMsg],
      };
      onUpdate(updated);
      saveAgentSession(updated);
    } catch (err) {
      setError(err instanceof AgentApiError ? err.message : '发送失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FDFCFB] max-w-lg mx-auto">
      <header className="h-12 border-b flex items-center justify-between px-4 shrink-0">
        <h2 className="text-sm font-bold">随访问答</h2>
        <button type="button" onClick={onClose} aria-label="关闭" className="p-1.5 hover:bg-black/5">
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-neutral-500 font-serif text-center py-8">
            基于本次报告上下文回答，不会替代医生诊断。
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'user'
                ? 'ml-8 p-3 bg-[#1A1A1A] text-white text-sm font-serif rounded-sm'
                : 'mr-4 p-3 bg-white border border-neutral-200 text-sm font-serif leading-relaxed rounded-sm'
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Agent 思考中…
          </div>
        )}
        {error && <p className="text-xs text-rose-700 bg-rose-50 p-2">{error}</p>}
      </div>

      <div className="px-4 py-2 flex gap-2 overflow-x-auto shrink-0">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => void send(q)}
            className="shrink-0 px-3 py-1.5 text-[10px] border border-neutral-300 bg-white rounded-full"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="p-4 border-t flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例如：尿酸比去年高，要注意什么？"
          className="flex-1 px-3 py-2.5 border border-neutral-300 text-sm bg-white"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 bg-[#1A1A1A] text-white disabled:opacity-40"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
