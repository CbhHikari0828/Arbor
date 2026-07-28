import { Check, ChevronDown, KeyRound, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { WorkspaceScaffold } from "@/presentation/components/WorkspaceScaffold";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";
type FormState = { provider: string; baseUrl: string; modelName: string; displayName: string; apiKey: string };
interface AiModelConfig { id: string; provider: string; baseUrl: string; modelName: string; displayName: string; hasApiKey: boolean; isEnabled: boolean; isDefault: boolean }
const emptyForm: FormState = { provider: "openai-compatible", baseUrl: "", modelName: "", displayName: "", apiKey: "" };
const supportedProviders = [
  ["openai-compatible", "OpenAI Compatible"],
  ["openai", "OpenAI"],
  ["deepseek", "DeepSeek"],
  ["openrouter", "OpenRouter"],
  ["xai", "xAI / Grok"],
  ["siliconflow", "SiliconFlow"],
  ["moonshot", "Moonshot / Kimi"],
  ["ollama", "Ollama"],
] as const;

export function SettingsPage() {
  return <WorkspaceScaffold>{() => <ModelSettings />}</WorkspaceScaffold>;
}

function ModelSettings() {
  const [configs, setConfigs] = useState<AiModelConfig[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    const response = await fetch(`${apiBaseUrl}/api/model-configs`);
    if (!response.ok) throw new Error("load failed");
    setConfigs((await response.json()) as AiModelConfig[]);
  };

  useEffect(() => { void load().catch(() => setError("模型配置暂时无法加载，请确认后端服务已启动。")); }, []);

  const update = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!form.baseUrl.trim() || !form.modelName.trim() || !form.apiKey.trim()) { setError("请填写供应商 URL、模型名和 API Key。"); return; }
    setIsSaving(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/model-configs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, displayName: form.displayName || undefined, isDefault: configs.length === 0 }) });
      if (!response.ok) throw new Error("save failed");
      setForm(emptyForm);
      await load();
    } catch { setError("保存失败，请检查供应商地址、模型名称和后端服务。"); }
    finally { setIsSaving(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm("确定删除这个模型配置吗？")) return;
    const response = await fetch(`${apiBaseUrl}/api/model-configs/${id}`, { method: "DELETE" });
    if (!response.ok) { setError("删除模型配置失败。"); return; }
    await load();
  };

  return <div className="arbor-page-enter h-full overflow-y-auto bg-[#f7f7f7] px-8 py-9 dark:bg-[#0b1016]"><div className="mx-auto w-full max-w-4xl">
    <header className="border-b border-[#d8d8d8] pb-6 dark:border-[#27313a]"><p className="text-sm text-[#666666] dark:text-[#9ca8a2]">设置</p><h1 className="mt-2 text-2xl font-semibold text-[#161616] dark:text-[#f2f6f3]">模型供应商</h1><p className="mt-2 text-sm leading-6 text-[#666666] dark:text-[#9ca8a2]">添加 OpenAI 兼容接口的模型。API Key 仅加密保存在后端，不会再次显示。</p></header>
    <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"><div><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-[#1b1b1b] dark:text-[#eef3ef]">已配置模型</h2><span className="text-xs text-[#777777] dark:text-[#94a09a]">{configs.length} 个</span></div><div className="overflow-hidden rounded-lg border border-[#d8d8d8] bg-white dark:border-[#303a44] dark:bg-[#10161d]">{configs.length === 0 ? <p className="px-5 py-8 text-sm text-[#777777] dark:text-[#9ca8a2]">还没有可用模型，请在右侧添加第一个供应商。</p> : configs.map((config) => <article key={config.id} className="flex items-center justify-between gap-4 border-b border-[#e7e7e7] px-5 py-4 last:border-b-0 dark:border-[#27313a]"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold text-[#1d1d1d] dark:text-[#edf3ef]">{config.displayName || config.modelName}</h3>{config.isDefault ? <span className="inline-flex items-center gap-1 rounded bg-[#e9e9e9] px-1.5 py-0.5 text-[11px] text-[#222222] dark:bg-[#193524] dark:text-[#aee2bc]"><Check size={11} />默认</span> : null}</div><p className="mt-1 truncate text-xs text-[#777777] dark:text-[#9ca8a2]">{config.provider} · {config.modelName}</p><p className="mt-1 truncate text-xs text-[#999999] dark:text-[#748078]">{config.baseUrl}</p></div><button aria-label="删除模型" className="grid size-8 shrink-0 place-items-center rounded-md text-[#777777] hover:bg-[#f1f1f1] hover:text-[#b42318] dark:text-[#a0aaa5] dark:hover:bg-[#202a32]" onClick={() => void remove(config.id)} title="删除模型" type="button"><Trash2 size={16} /></button></article>)}</div></div>
    <form className="h-fit rounded-lg border border-[#d8d8d8] bg-white p-5 dark:border-[#303a44] dark:bg-[#10161d]" onSubmit={save}><div className="flex items-center gap-2"><KeyRound size={17} className="text-[#333333] dark:text-[#b8c8bf]" /><h2 className="text-base font-semibold text-[#1b1b1b] dark:text-[#eef3ef]">添加模型</h2></div><div className="mt-5 space-y-3"><Field label="供应商" placeholder="例如 deepseek" value={form.provider} onChange={(value) => update("provider", value)} /><Field label="供应商 URL" placeholder="https://api.example.com/v1" value={form.baseUrl} onChange={(value) => update("baseUrl", value)} /><Field label="模型名" placeholder="例如 deepseek-chat" value={form.modelName} onChange={(value) => update("modelName", value)} /><Field label="显示名称（可选）" placeholder="例如 DeepSeek Chat" value={form.displayName} onChange={(value) => update("displayName", value)} /><Field label="API Key" type="password" value={form.apiKey} onChange={(value) => update("apiKey", value)} /></div>{error ? <p className="mt-3 text-xs leading-5 text-[#b42318] dark:text-[#ffae91]">{error}</p> : null}<button className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#111111] text-sm font-medium text-white transition hover:bg-[#303030] disabled:opacity-60 dark:bg-[#4b8a5c] dark:hover:bg-[#5ba66e]" disabled={isSaving} type="submit"><Plus size={16} />{isSaving ? "保存中..." : "保存模型"}</button></form></section>
  </div></div>;
}

function Field({ label, placeholder, type = "text", value, onChange }: { label: string; placeholder?: string; type?: string; value: string; onChange: (value: string) => void }) {
  const className = "mt-1.5 h-10 w-full rounded-md border border-[#d8d8d8] bg-[#fafafa] px-3 text-sm text-[#1d1d1d] outline-none focus:border-[#111111] dark:border-[#35414b] dark:bg-[#0c1218] dark:text-[#edf3ef] dark:focus:border-[#6eb985]";
  const isProvider = placeholder?.includes("deepseek") && !placeholder.includes("deepseek-chat");
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedProviderLabel = supportedProviders.find(([provider]) => provider === value)?.[1] ?? value;

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => window.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  return <label className="block text-xs font-medium text-[#444444] dark:text-[#c8d2cc]"><span>{label}</span>{isProvider ? <span className="relative mt-1.5 block" ref={menuRef}><button aria-expanded={isOpen} aria-haspopup="listbox" className={`${className} flex items-center justify-between border-[#bfc3bf] bg-white pr-1.5 text-left font-medium shadow-[0_2px_5px_rgba(0,0,0,0.04)] hover:border-[#737873] dark:border-[#405047] dark:bg-[#10161d] dark:hover:border-[#708278]`} onClick={() => setIsOpen((open) => !open)} type="button"><span className="truncate">{selectedProviderLabel}</span><span className={`grid size-7 shrink-0 place-items-center rounded-md border border-[#dedede] bg-[#f2f2f2] text-[#454545] transition duration-200 dark:border-[#34413b] dark:bg-[#1a2520] dark:text-[#c5d2ca] ${isOpen ? "rotate-180 bg-[#e7e7e7] dark:bg-[#24332b]" : ""}`}><ChevronDown size={15} strokeWidth={2} /></span></button>{isOpen ? <span className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-[#c9c9c9] bg-white p-1.5 shadow-[0_16px_34px_rgba(0,0,0,0.16)] dark:border-[#3b4a42] dark:bg-[#131c19]" role="listbox">{supportedProviders.map(([provider, providerLabel]) => <button aria-selected={provider === value} className={`flex h-9 w-full items-center rounded-md px-2.5 text-left text-sm transition ${provider === value ? "bg-[#181818] text-white dark:bg-[#5b9d6c]" : "text-[#303030] hover:bg-[#eeeeee] dark:text-[#dce7df] dark:hover:bg-[#223028]"}`} key={provider} onClick={() => { onChange(provider); setIsOpen(false); }} role="option" type="button">{providerLabel}</button>)}</span> : null}</span> : <input className={className} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} />}</label>;
}
