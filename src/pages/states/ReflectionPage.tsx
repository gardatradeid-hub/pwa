import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useTradeStore } from '@/store/useTradeStore';
import { Brain, AlertTriangle, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReflectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { setIsLocked, setCooldownUntil } = useTradeStore();

  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [emotion, setEmotion] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [lockEventId, setLockEventId] = useState<string | null>(null);

  // Load active lock event
  useEffect(() => {
    async function loadLock() {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('lock_events')
        .select('*')
        .eq('user_id', profile.id)
        .eq('reflection_completed', false)
        .gt('unlocks_at', new Date().toISOString())
        .order('locked_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setLockEventId(data[0].id);
        // Pre-fill if already partially completed
        if (data[0].reflection_mistake) setQ1(data[0].reflection_mistake);
        if (data[0].reflection_plan) setQ2(data[0].reflection_plan);
        if (data[0].reflection_emotion) setEmotion(data[0].reflection_emotion);
      }
    }
    loadLock();
  }, [profile?.id]);

  const emotions = [
    { key: 'calm', label: t('reflection.calm'), color: 'bg-green-500/10 text-green-400 border-green-500/30' },
    { key: 'ready', label: t('reflection.ready'), color: 'bg-garda-cyan/10 text-garda-cyan border-garda-cyan/30' },
    { key: 'still_upset', label: t('reflection.still_upset'), color: 'bg-garda-amber/10 text-garda-amber border-garda-amber/30' },
  ];

  const handleSubmit = async () => {
    if (!q1.trim() || !q2.trim() || !emotion) {
      setError('Semua pertanyaan wajib diisi sebelum lanjut trading');
      return;
    }

    if (emotion === 'still_upset') {
      setShowWarning(true);
      return;
    }

    await submitReflection();
  };

  const submitReflection = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Save reflection to lock event
      if (lockEventId) {
        await supabase
          .from('lock_events')
          .update({
            reflection_mistake: q1,
            reflection_plan: q2,
            reflection_emotion: emotion,
            reflection_completed: true,
          })
          .eq('id', lockEventId);
      }

      // Release lock
      setIsLocked(false);
      setCooldownUntil(null);
      navigate('/app');
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-garda-amber/10 flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-garda-amber" />
        </div>
        <h1 className="text-2xl font-bold">{t('reflection.title')}</h1>
        <p className="mt-2 text-garda-text-secondary text-sm">{t('reflection.subtitle')}</p>
      </div>

      {/* Q1: What was the main mistake */}
      <div className="garda-card p-5">
        <label className="block text-sm font-medium text-garda-text-secondary mb-3">
          {t('reflection.q1')}
        </label>
        <textarea
          value={q1}
          onChange={(e) => setQ1(e.target.value)}
          placeholder={t('reflection.q1_placeholder')}
          rows={3}
          className="garda-input w-full resize-none"
        />
      </div>

      {/* Q2: What will you do differently */}
      <div className="garda-card p-5">
        <label className="block text-sm font-medium text-garda-text-secondary mb-3">
          {t('reflection.q2')}
        </label>
        <textarea
          value={q2}
          onChange={(e) => setQ2(e.target.value)}
          placeholder={t('reflection.q2_placeholder')}
          rows={3}
          className="garda-input w-full resize-none"
        />
      </div>

      {/* Q3: Emotion */}
      <div className="garda-card p-5">
        <label className="block text-sm font-medium text-garda-text-secondary mb-4">
          {t('reflection.q3')}
        </label>
        <div className="space-y-2">
          {emotions.map((em) => (
            <button
              key={em.key}
              onClick={() => setEmotion(em.key)}
              className={cn(
                'w-full py-3 px-4 rounded-lg text-sm font-medium border transition-all flex items-center gap-3',
                emotion === em.key
                  ? em.color + ' border-2'
                  : 'border-garda-border text-garda-text-secondary hover:border-garda-border-hover'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                emotion === em.key ? 'border-current' : 'border-garda-border'
              )}>
                {emotion === em.key && <Check className="w-3 h-3" />}
              </div>
              {em.label}
            </button>
          ))}
        </div>
      </div>

      {/* Warning for still upset */}
      {showWarning && (
        <div className="garda-card p-5 border-garda-amber/30 bg-garda-amber/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-garda-amber mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-garda-amber">
                {t('reflection.upset_warning')}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowWarning(false)}
                  className="text-xs text-garda-text-muted hover:text-garda-text-secondary"
                >
                  {t('common.back')}
                </button>
                <button
                  onClick={submitReflection}
                  className="text-xs text-garda-pink font-medium hover:underline"
                >
                  Tetap lanjutkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-garda-pink/10 border border-garda-pink/20 text-garda-pink text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="garda-btn-primary w-full flex items-center justify-center gap-2"
      >
        {isSubmitting ? t('common.loading') : t('reflection.submit')}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
