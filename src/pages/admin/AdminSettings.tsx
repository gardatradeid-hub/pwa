import { useState, useEffect } from 'react';
import { useAdminConfig } from '@/hooks/useAdmin';
import { adminFetch } from '@/pages/admin/AdminLogin';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminSettings() {
  const { data, isLoading, refetch } = useAdminConfig();
  const [config, setConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data?.data) setConfig(data.data);
  }, [data]);

  const handleUpdate = async (key: string, rawValue: string) => {
    setSaving(key); setMsg(null);
    try {
      let value: any;
      try { value = JSON.parse(rawValue); } catch { value = rawValue; }
      await adminFetch('admin-api', { action: 'update_config', key, value: typeof value === 'string' ? value : JSON.stringify(value) });
      setMsg(`Config "${key}" berhasil diupdate.`);
      refetch();
    } catch (e: any) { setMsg(e.message || 'Gagal'); }
    finally { setSaving(null); }
  };

  if (isLoading) return <div className="flex items-center gap-2 py-12 justify-center text-garda-text-muted"><Loader2 className="w-5 h-5 animate-spin" />Memuat...</div>;

  const configEntries = Object.entries(config);

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">App Settings</h1>
      <p className="text-xs text-garda-text-muted">Konfigurasi ini disimpan di tabel <code className="font-mono text-garda-cyan">app_config</code>. Edit dengan hati-hati.</p>

      {msg && (
        <div className={cn('p-3 rounded-lg text-sm', msg.includes('berhasil') ? 'bg-garda-cyan/10 text-garda-cyan border border-garda-cyan/20' : 'bg-garda-pink/10 text-garda-pink border border-garda-pink/20')}>
          {msg}
        </div>
      )}

      <div className="space-y-3">
        {configEntries.map(([key, value]) => (
          <ConfigEditor key={key} configKey={key} initialValue={JSON.stringify(value, null, 2)}
            onSave={(val) => handleUpdate(key, val)}
            isSaving={saving === key} />
        ))}
      </div>
    </div>
  );
}

// no-op; adminFetch used instead

interface ConfigEditorProps {
  configKey: string;
  initialValue: string;
  onSave: (val: string) => void;
  isSaving: boolean;
}

function ConfigEditor({ configKey, initialValue, onSave, isSaving }: ConfigEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { setValue(initialValue); }, [initialValue]);

  const isModified = value !== initialValue;

  return (
    <div className="garda-card p-4 space-y-2">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <span className="font-mono-num text-sm font-semibold text-garda-cyan">{configKey}</span>
        <span className="text-xs text-garda-text-muted">{expanded ? 'Tutup' : 'Buka'}</span>
      </button>
      {expanded && (
        <>
          <textarea value={value} onChange={(e) => setValue(e.target.value)}
            className="garda-input w-full font-mono-num text-xs h-[120px] resize-y" />
          <div className="flex justify-end gap-2">
            {isModified && <span className="text-[10px] text-garda-amber self-center">Belum disimpan</span>}
            <button onClick={() => onSave(value)} disabled={!isModified || isSaving}
              className="garda-btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5">
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Simpan
            </button>
          </div>
        </>
      )}
    </div>
  );
}
