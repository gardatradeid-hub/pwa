import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/config/supabase';
import { useTradeStore } from '@/store/useTradeStore';
import { formatR, formatUSDT } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { X, TrendingUp, TrendingDown, Smile, Frown } from 'lucide-react';

const EMOTIONS = ['tenang', 'ragu', 'fomo', 'takut', 'puas', 'greedy', 'panik', 'relief'] as const;

export function PostTradeModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showPostTradeModal, lastClosedTradeId, setShowPostTradeModal } = useTradeStore();

  const [emotionEntry, setEmotionEntry] = useState<string | null>(null);
  const [emotionExit, setEmotionExit] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch last trade result
  const [tradeResult, setTradeResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useState(() => {
    async function load() {
      if (!lastClosedTradeId) return;
      try {
        const { data } = await supabase
          .from('trades')
          .select('*')
          .eq('id', lastClosedTradeId)
          .single();
        setTradeResult(data);
      } catch (err) {
        console.error('Load trade error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (lastClosedTradeId) load();
  });

  if (!showPostTradeModal) return null;

  const isWin = tradeResult?.pnl_r > 0;
  const isSubmitting = isSaving || isLoading;

  const handleSave = async () => {
    if (!emotionEntry || !emotionExit) {
      setError(t('journal.must_fill'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('trades')
        .update({
          emotion_entry: emotionEntry,
          emotion_exit: emotionExit,
          notes: notes || null,
        })
        .eq('id', lastClosedTradeId);

      if (updateError) throw updateError;

      setShowPostTradeModal(false);
      navigate('/app/journal');
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {}} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-garda-card border border-garda-border rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto safe-bottom">
        {/* Close button */}
        <button
          onClick={() => {}}
          disabled
          className="absolute top-4 right-4 p-1 text-garda-text-muted"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Result */}
        <div className="text-center mb-6">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3',
            isWin ? 'bg-garda-cyan/10' : 'bg-garda-pink/10'
          )}>
            {isWin ? (
              <TrendingUp className="w-8 h-8 text-garda-cyan" />
            ) : (
              <TrendingDown className="w-8 h-8 text-garda-pink" />
            )}
          </div>
          <h2 className={cn('text-2xl font-bold', isWin ? 'text-garda-cyan' : 'text-garda-pink')}>
            {isWin ? t('common.win').toUpperCase() : t('common.loss').toUpperCase()}
          </h2>
          {tradeResult && (
            <p className="text-lg font-mono-num font-bold mt-1">
              {formatR(tradeResult.pnl_r)}
            </p>
          )}
        </div>

        {/* Emotion Entry */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-garda-text-secondary mb-3">
            {t('journal.emotion_entry')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {EMOTIONS.map((em) => (
              <button
                key={em}
                onClick={() => setEmotionEntry(em)}
                className={cn(
                  'py-2 px-1 rounded-lg text-xs font-medium transition-colors',
                  emotionEntry === em
                    ? 'bg-garda-cyan text-[#0A0A14]'
                    : 'bg-garda-surface border border-garda-border text-garda-text-secondary hover:border-garda-border-hover'
                )}
              >
                {t(`emotions.${em}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Emotion Exit */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-garda-text-secondary mb-3">
            {t('journal.emotion_exit')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {EMOTIONS.map((em) => (
              <button
                key={em}
                onClick={() => setEmotionExit(em)}
                className={cn(
                  'py-2 px-1 rounded-lg text-xs font-medium transition-colors',
                  emotionExit === em
                    ? 'bg-garda-cyan text-[#0A0A14]'
                    : 'bg-garda-surface border border-garda-border text-garda-text-secondary hover:border-garda-border-hover'
                )}
              >
                {t(`emotions.${em}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-garda-text-secondary mb-2">
            {t('journal.notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('journal.notes_placeholder')}
            rows={3}
            className="garda-input w-full resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-garda-pink/10 border border-garda-pink/20 text-garda-pink text-sm mb-4">
            {error}
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isSubmitting || !emotionEntry || !emotionExit}
          className="garda-btn-primary w-full"
        >
          {isSubmitting ? t('common.loading') : t('journal.save')}
        </button>

        <p className="text-xs text-garda-text-muted text-center mt-3">
          {t('journal.must_fill')}
        </p>
      </div>
    </div>
  );
}
