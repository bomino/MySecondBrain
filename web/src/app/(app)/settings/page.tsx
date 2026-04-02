"use client";

import { useState } from "react";
import { Plus, Trash2, Tag as TagIcon, Cpu, Eye, EyeOff, Zap, Globe, Server } from "lucide-react";
import { useTags, useCreateTag, useDeleteTag } from "@/hooks/use-tags";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { ColorPicker } from "@/components/tags/color-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUIStore } from "@/stores/ui-store";

export default function SettingsPage() {
  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#d97706");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: aiSettings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [aiForm, setAiForm] = useState({
    aiRoutingMode: "",
    anthropicApiKey: "",
    ollamaBaseUrl: "",
    chatModelCloud: "",
    chatModelLocal: "",
    embeddingModel: "",
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [prefs, setPrefs] = useState({
    autoTagEnabled: true,
    autoTagAutoApply: false,
    defaultNoteSensitive: false,
    defaultSearchMode: "combined",
    toastsEnabled: true,
  });
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const { editorFontSize, editorLineHeight, setEditorFontSize, setEditorLineHeight } = useUIStore();

  if (!prefsLoaded && aiSettings) {
    setPrefs({
      autoTagEnabled: aiSettings.autoTagEnabled ?? true,
      autoTagAutoApply: aiSettings.autoTagAutoApply ?? false,
      defaultNoteSensitive: aiSettings.defaultNoteSensitive ?? false,
      defaultSearchMode: aiSettings.defaultSearchMode ?? "combined",
      toastsEnabled: aiSettings.toastsEnabled ?? true,
    });
    setPrefsLoaded(true);
  }

  if (!aiLoaded && aiSettings) {
    setAiForm({
      aiRoutingMode: aiSettings.aiRoutingMode,
      anthropicApiKey: "",
      ollamaBaseUrl: aiSettings.ollamaBaseUrl,
      chatModelCloud: aiSettings.chatModelCloud,
      chatModelLocal: aiSettings.chatModelLocal,
      embeddingModel: aiSettings.embeddingModel,
    });
    setAiLoaded(true);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createTag.mutate({ name: newName.trim(), color: newColor });
    setNewName("");
  }

  return (
    <div className="mx-auto max-w-2xl p-8 fade-in">
      <h1 className="mb-6 text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>Settings</h1>

      <section className="mb-8">
        <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          <TagIcon size={16} className="mr-2 inline" />
          Tags
        </h2>

        <form onSubmit={handleCreate} className="mb-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New tag name"
              className="w-full rounded-lg px-3 py-2 text-sm input-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>Color</label>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <button type="submit" className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm btn-accent">
            <Plus size={14} /> Add
          </button>
        </form>

        {isLoading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading...</p>
        ) : (tags ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm" style={{ color: "var(--text-faint)" }}>No tags yet.</p>
        ) : (
          <div className="flex flex-col gap-2 stagger-in">
            {(tags ?? []).map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between rounded-lg p-3"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{tag.name}</span>
                </div>
                <button
                  onClick={() => setDeleteId(tag.id)}
                  className="rounded p-1 transition-colors duration-100"
                  style={{ color: "var(--text-faint)" }}
                  aria-label={`Delete tag ${tag.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Editor
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm" style={{ color: "var(--text-primary)" }}>Font size</label>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>{editorFontSize}px</span>
            </div>
            <input
              type="range"
              min={12}
              max={22}
              step={1}
              value={editorFontSize}
              onChange={(e) => setEditorFontSize(Number(e.target.value))}
              className="w-full accent-[#d97706]"
            />
            <div className="flex justify-between text-[10px]" style={{ color: "var(--text-faint)" }}>
              <span>Small</span><span>Large</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm" style={{ color: "var(--text-primary)" }}>Line spacing</label>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>{editorLineHeight}</span>
            </div>
            <input
              type="range"
              min={1.2}
              max={2.2}
              step={0.1}
              value={editorLineHeight}
              onChange={(e) => setEditorLineHeight(Number(e.target.value))}
              className="w-full accent-[#d97706]"
            />
            <div className="flex justify-between text-[10px]" style={{ color: "var(--text-faint)" }}>
              <span>Compact</span><span>Spacious</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Preferences
        </h2>
        <div className="space-y-4">
          <ToggleSetting
            label="Auto-tag new notes"
            description="AI suggests tags when you create a note"
            value={prefs.autoTagEnabled}
            onChange={(v) => { setPrefs(p => ({ ...p, autoTagEnabled: v })); updateSettings.mutate({ autoTagEnabled: v }); }}
          />
          <ToggleSetting
            label="Auto-apply suggested tags"
            description="Apply tags automatically without manual review"
            value={prefs.autoTagAutoApply}
            onChange={(v) => { setPrefs(p => ({ ...p, autoTagAutoApply: v })); updateSettings.mutate({ autoTagAutoApply: v }); }}
          />
          <ToggleSetting
            label="New notes are sensitive by default"
            description="New notes will use local AI processing only"
            value={prefs.defaultNoteSensitive}
            onChange={(v) => { setPrefs(p => ({ ...p, defaultNoteSensitive: v })); updateSettings.mutate({ defaultNoteSensitive: v }); }}
          />
          <ToggleSetting
            label="Toast notifications"
            description="Show success and error popups"
            value={prefs.toastsEnabled}
            onChange={(v) => { setPrefs(p => ({ ...p, toastsEnabled: v })); updateSettings.mutate({ toastsEnabled: v }); }}
          />
          <div>
            <label className="mb-2 block text-xs" style={{ color: "var(--text-muted)" }}>Default search mode</label>
            <div className="flex gap-1">
              {(["combined", "fulltext", "semantic"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setPrefs(p => ({ ...p, defaultSearchMode: m })); updateSettings.mutate({ defaultSearchMode: m }); }}
                  className="flex-1 rounded-lg py-2 text-xs font-medium transition-all duration-150"
                  style={{
                    backgroundColor: prefs.defaultSearchMode === m ? "var(--accent-muted)" : "var(--surface)",
                    color: prefs.defaultSearchMode === m ? "var(--accent-light)" : "var(--text-secondary)",
                    border: `1px solid ${prefs.defaultSearchMode === m ? "rgba(217,119,6,0.3)" : "var(--border)"}`,
                  }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          <Cpu size={16} className="mr-2 inline" />
          AI Configuration
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs" style={{ color: "var(--text-muted)" }}>Routing Mode</label>
            <div className="flex gap-1">
              {[
                { value: "hybrid", label: "Hybrid", icon: Zap, desc: "Sensitive → local, others → cloud" },
                { value: "local", label: "Local", icon: Server, desc: "Everything via Ollama" },
                { value: "cloud", label: "Cloud", icon: Globe, desc: "Everything via Claude API" },
              ].map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  onClick={() => setAiForm((f) => ({ ...f, aiRoutingMode: value }))}
                  className="flex flex-1 flex-col items-center gap-1 rounded-lg p-3 text-xs transition-all duration-150"
                  style={{
                    backgroundColor: aiForm.aiRoutingMode === value ? "var(--accent-muted)" : "var(--surface)",
                    color: aiForm.aiRoutingMode === value ? "var(--accent-light)" : "var(--text-secondary)",
                    border: `1px solid ${aiForm.aiRoutingMode === value ? "rgba(217,119,6,0.3)" : "var(--border)"}`,
                  }}
                >
                  <Icon size={16} />
                  <span className="font-medium">{label}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>
              Anthropic API Key{" "}
              {aiSettings?.hasEnvApiKey && !aiSettings?.hasApiKeyOverride && (
                <span style={{ color: "var(--text-faint)" }}>(from .env)</span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type={showApiKey ? "text" : "password"}
                value={aiForm.anthropicApiKey}
                onChange={(e) => setAiForm((f) => ({ ...f, anthropicApiKey: e.target.value }))}
                placeholder={aiSettings?.anthropicApiKey || "sk-ant-..."}
                className="flex-1 rounded-lg px-3 py-2 text-sm input-base"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="rounded-lg px-2 btn-surface"
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
              >
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>Ollama URL</label>
            <input
              type="text"
              value={aiForm.ollamaBaseUrl}
              onChange={(e) => setAiForm((f) => ({ ...f, ollamaBaseUrl: e.target.value }))}
              placeholder="http://localhost:11434"
              className="w-full rounded-lg px-3 py-2 text-sm input-base"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>Cloud Model</label>
              <input
                type="text"
                value={aiForm.chatModelCloud}
                onChange={(e) => setAiForm((f) => ({ ...f, chatModelCloud: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm input-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>Local Model</label>
              <input
                type="text"
                value={aiForm.chatModelLocal}
                onChange={(e) => setAiForm((f) => ({ ...f, chatModelLocal: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm input-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>Embedding Model</label>
              <input
                type="text"
                value={aiForm.embeddingModel}
                onChange={(e) => setAiForm((f) => ({ ...f, embeddingModel: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm input-base"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const data: Record<string, string | undefined> = {};
                if (aiForm.aiRoutingMode) data.aiRoutingMode = aiForm.aiRoutingMode;
                if (aiForm.anthropicApiKey) data.anthropicApiKey = aiForm.anthropicApiKey;
                if (aiForm.ollamaBaseUrl) data.ollamaBaseUrl = aiForm.ollamaBaseUrl;
                if (aiForm.chatModelCloud) data.chatModelCloud = aiForm.chatModelCloud;
                if (aiForm.chatModelLocal) data.chatModelLocal = aiForm.chatModelLocal;
                if (aiForm.embeddingModel) data.embeddingModel = aiForm.embeddingModel;
                updateSettings.mutate(data);
              }}
              className="rounded-lg px-6 py-2 text-sm btn-accent"
            >
              Save AI Settings
            </button>
            <button
              onClick={() => {
                updateSettings.mutate({
                  aiRoutingMode: "",
                  anthropicApiKey: "",
                  ollamaBaseUrl: "",
                  chatModelCloud: "",
                  chatModelLocal: "",
                  embeddingModel: "",
                });
                setAiLoaded(false);
              }}
              className="text-xs"
              style={{ color: "var(--text-faint)" }}
            >
              Reset to defaults
            </button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete tag"
        description="This will remove the tag from all notes. Continue?"
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (deleteId) deleteTag.mutate(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function ToggleSetting({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
        <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative h-6 w-11 rounded-full transition-colors duration-200"
        style={{ backgroundColor: value ? "var(--accent)" : "var(--elevated)" }}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <span
          className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
          style={{ transform: value ? "translateX(20px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}
