import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminConfig } from '@/hooks/useAdmin';
import { adminFetch } from '@/pages/admin/AdminLogin';
import { Loader2, Save, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminSettings() {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useAdminConfig();
  const [config, setConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { if (data?.data) setConfig(data.data); }, [data]);

  const handleUpdate = async (key: string, rawValue: string) => {
    setSaving(key); setMsg(null);
    try {
      let value: any;
      try { value = JSON.parse(rawValue); } catch { value = rawValue; }
      await adminFetch('admin-api', {
        action: 'update_config',
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      });
      setMsg(`"${key}" ${t('admin.config_saved')}`);
      refetch();
    } catch (e: any) { setMsg(e.message || t('common.error')); }
    finally { setSaving(null); }
  };

  if (isLoading) return (
    <div className="flex items-center gap-2 py-16 justify-center text-garda-text-muted text-xs">
      <Loader2 className="w-4 h-4 animate-spin" />{t('common.loading')}
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">{t('admin.settings_title')}</h1>
        <p className="text-xs text-garda-text-muted mt-1">{t('admin.settings_subtitle')}</p>
      </div>

      {msg && (
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-lg text-xs border',
          msg.includes('berhasil') || msg.includes('saved') || msg.includes(t('admin.config_saved'))
            ? 'bg-garda-cyan/5 border-garda-cyan/20 text-garda-cyan'
            : 'bg-garda-pink/5 border-garda-pink/20 text-garda-pink',
        )}>
          {msg}
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(config).map(([key, value]) => (
          <ConfigEditor
            key={key}
            configKey={key}
            initialValue={JSON.stringify(value, null, 2)}
            onSave={(val) => handleUpdate(key, val)}
            isSaving={saving === key}
          />
        ))}
      </div>
    </div>
  );
}

function ConfigEditor({
  configKey, initialValue, onSave, isSaving,
}: {
  configKey: string; initialValue: string;
  onSave: (val: string) => void; isSaving: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { setValue(initialValue); }, [initialValue]);
  const isModified = value !== initialValue;

  return (
    <div className="garda-card border-garda-border">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-garda-surface/30 transition-colors rounded-xl">
        <div className="flex items-center gap-3">
          <span className="font-mono-num text-sm font-semibold text-garda-cyan">{configKey}</span>
          {isModified && <span className="text-[10px] text-garda-amber font-medium">(modified)</span>}
        </div>
        <RotateCw className={cn('w-3.5 h-3.5 text-garda-text-muted transition-transform', expanded && 'rotate-180')} />
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <textarea value={value} onChange={(e) => setValue(e.target.value)}
            className="garda-input w-full font-mono-num text-xs h-[120px] resize-y bg-garda-bg" />
          <div className="flex justify-end">
            <button onClick={() => onSave(value)} disabled={!isModified || isSaving}
              className="garda-btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5">
              {isSaving
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Save className="w-3 h-3" />}
              Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
