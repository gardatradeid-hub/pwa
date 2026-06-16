import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/config/supabase';
import { EXCHANGES } from '@/types/exchange';
import type { Exchange } from '@/types/exchange';
import { CheckCircle2, AlertCircle, ExternalLink, Shield, ArrowRight } from 'lucide-react';

const connectSchema = z.object({
  exchange: z.enum(['bybit', 'binance', 'okx']),
  api_key: z.string().min(1, 'API Key wajib diisi'),
  api_secret: z.string().min(1, 'API Secret wajib diisi'),
});

type ConnectInputs = z.infer<typeof connectSchema>;

export default function ConnectExchange() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ConnectInputs>({
    resolver: zodResolver(connectSchema),
    defaultValues: { exchange: 'bybit' },
  });

  const selectedExchange = watch('exchange');

  const onSubmit = async (data: ConnectInputs) => {
    setError(null);
    setIsConnecting(true);
    try {
      // Store API keys (in production, these would be encrypted via Edge Function)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          exchange: data.exchange,
          api_key_encrypted: data.api_key,
          api_secret_encrypted: data.api_secret,
        })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => navigate('/onboarding/rules'), 1000);
    } catch (e: any) {
      setError(e.message || 'Gagal menghubungkan exchange');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-garda-bg px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{t('onboarding.connect_title')}</h1>
          <p className="mt-2 text-garda-text-secondary">{t('onboarding.connect_subtitle')}</p>
        </div>

        {/* Safety note */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-garda-cyan/5 border border-garda-cyan/20 mb-6">
          <Shield className="w-5 h-5 text-garda-cyan mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-garda-cyan">{t('onboarding.safe_note')}</p>
            <p className="text-xs text-garda-text-secondary mt-1">{t('onboarding.api_hint')}</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-pink/10 border border-garda-pink/20 text-garda-pink text-sm mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-cyan/10 border border-garda-cyan/20 text-garda-cyan text-sm mb-6">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Exchange terhubung! Melanjutkan...
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Exchange selector */}
          <div>
            <label className="block text-sm font-medium text-garda-text-secondary mb-2">
              Exchange
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.values(EXCHANGES) as Array<{ id: Exchange; name: string; color: string }>).map((ex) => (
                <label
                  key={ex.id}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedExchange === ex.id
                      ? 'border-garda-cyan bg-garda-cyan/5'
                      : 'border-garda-border hover:border-garda-border-hover'
                  }`}
                >
                  <input
                    type="radio"
                    value={ex.id}
                    {...register('exchange')}
                    className="sr-only"
                  />
                  <span className="text-lg font-bold" style={{ color: ex.color }}>
                    {ex.name}
                  </span>
                  {selectedExchange === ex.id && (
                    <CheckCircle2 className="w-4 h-4 text-garda-cyan" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-garda-text-secondary mb-1.5">
              {t('onboarding.api_key')}
            </label>
            <input
              {...register('api_key')}
              type="text"
              className="garda-input w-full"
              placeholder="Masukkan API key"
            />
            {errors.api_key && (
              <p className="mt-1 text-xs text-garda-pink">{errors.api_key.message as string}</p>
            )}
          </div>

          {/* API Secret */}
          <div>
            <label className="block text-sm font-medium text-garda-text-secondary mb-1.5">
              {t('onboarding.api_secret')}
            </label>
            <input
              {...register('api_secret')}
              type="password"
              className="garda-input w-full"
              placeholder="Masukkan API secret"
            />
            {errors.api_secret && (
              <p className="mt-1 text-xs text-garda-pink">{errors.api_secret.message as string}</p>
            )}
          </div>

          {/* How to */}
          <a
            href="#"
            className="inline-flex items-center gap-1 text-sm text-garda-text-muted hover:text-garda-text-secondary"
          >
            <ExternalLink className="w-3 h-3" />
            {t('onboarding.how_to')}
          </a>

          {/* Submit */}
          <button
            type="submit"
            disabled={isConnecting}
            className="garda-btn-primary w-full flex items-center justify-center gap-2"
          >
            {isConnecting ? t('common.loading') : t('onboarding.connect_verify')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
