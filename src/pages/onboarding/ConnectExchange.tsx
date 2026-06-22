import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/config/supabase';
import { EXCHANGES, EXCHANGE_LIST, type Exchange } from '@/types/exchange';
import { CheckCircle2, AlertCircle, Shield, ArrowRight, Search } from 'lucide-react';

const connectSchema = z.object({
  exchange: z.string().min(1, 'Pilih exchange terlebih dahulu'),
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
  const [search, setSearch] = useState('');
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ConnectInputs>({
    resolver: zodResolver(connectSchema),
  });

  const filteredExchanges = useMemo(() => {
    if (!search.trim()) return EXCHANGE_LIST;
    const q = search.toLowerCase();
    return EXCHANGE_LIST.filter((ex) => ex.name.toLowerCase().includes(q));
  }, [search]);

  const selectedInfo = selectedExchange ? EXCHANGES[selectedExchange] : null;

  const onSubmit = async (data: ConnectInputs) => {
    setError(null);
    setIsConnecting(true);
    try {
      const { data: resp, error: fnError } = await supabase.functions.invoke(
        'connect-exchange',
        { body: { exchange: data.exchange, api_key: data.api_key, api_secret: data.api_secret } },
      );
      if (fnError) throw new Error(fnError.message);
      if (resp && resp.error) throw new Error(resp.error);
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
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{t('onboarding.connect_title')}</h1>
          <p className="mt-2 text-garda-text-secondary">{t('onboarding.connect_subtitle')}</p>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-garda-cyan/5 border border-garda-cyan/20 mb-6">
          <Shield className="w-5 h-5 text-garda-cyan mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-garda-cyan">{t('onboarding.safe_note')}</p>
            <p className="text-xs text-garda-text-secondary mt-1">{t('onboarding.api_hint')}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-pink/10 border border-garda-pink/20 text-garda-pink text-sm mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-cyan/10 border border-garda-cyan/20 text-garda-cyan text-sm mb-6">
            <CheckCircle2 className="w-4 h-4 shrink-0" />Exchange terhubung! Melanjutkan...
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Exchange selector — scrollable list with logos */}
          <div>
            <label className="block text-sm font-medium text-garda-text-secondary mb-2">Exchange</label>

            {/* Search bar */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-garda-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari exchange..."
                className="garda-input w-full pl-9 text-sm"
              />
            </div>

            {/* Selected exchange pill */}
            {selectedInfo && (
              <div className="flex items-center gap-2 p-2 mb-2 rounded-lg bg-garda-cyan/10 border border-garda-cyan/30">
                <img src={selectedInfo.logo} alt={selectedInfo.name} className="w-6 h-6 rounded" />
                <span className="font-semibold text-sm" style={{ color: selectedInfo.color }}>{selectedInfo.name}</span>
                <span className="text-xs text-garda-text-muted ml-auto">{t('profile.connected_exchange')}</span>
              </div>
            )}

            {/* Scrollable exchange list */}
            <input type="hidden" {...register('exchange')} value={selectedExchange || ''} />
            {errors.exchange && <p className="mt-1 text-xs text-garda-pink">{errors.exchange.message as string}</p>}
            <div className="border border-garda-border rounded-xl overflow-hidden">
              <div className="max-h-[280px] overflow-y-auto divide-y divide-garda-border">
                {filteredExchanges.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setSelectedExchange(ex.id);
                      setValue('exchange', ex.id, { shouldValidate: true });
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-garda-surface ${
                      selectedExchange === ex.id ? 'bg-garda-cyan/5' : ''
                    }`}
                  >
                    <img src={ex.logo} alt={ex.name} className="w-8 h-8 rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${
                        selectedExchange === ex.id ? 'text-garda-cyan' : 'text-garda-text'
                      }`}>
                        {ex.name}
                      </p>
                      <p className="text-[11px] text-garda-text-muted capitalize">{ex.id}</p>
                    </div>
                    {selectedExchange === ex.id && <CheckCircle2 className="w-5 h-5 text-garda-cyan shrink-0" />}
                  </button>
                ))}
                {filteredExchanges.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-garda-text-muted">Exchange tidak ditemukan</p>
                )}
              </div>
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-garda-text-secondary mb-1.5">{t('onboarding.api_key')}</label>
            <input {...register('api_key')} type="text" className="garda-input w-full" placeholder="Masukkan API key" />
            {errors.api_key && <p className="mt-1 text-xs text-garda-pink">{errors.api_key.message as string}</p>}
          </div>

          {/* API Secret */}
          <div>
            <label className="block text-sm font-medium text-garda-text-secondary mb-1.5">{t('onboarding.api_secret')}</label>
            <input {...register('api_secret')} type="password" className="garda-input w-full" placeholder="Masukkan API secret" />
            {errors.api_secret && <p className="mt-1 text-xs text-garda-pink">{errors.api_secret.message as string}</p>}
          </div>

          {/* Submit */}
          <button type="submit" disabled={isConnecting || !selectedExchange}
            className="garda-btn-primary w-full flex items-center justify-center gap-2">
            {isConnecting ? t('common.loading') : t('onboarding.connect_verify')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
