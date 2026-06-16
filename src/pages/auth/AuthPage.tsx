import { useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Mail, ArrowRight, AlertCircle, Check } from 'lucide-react';

// Determine if we're on login or register based on path
function useAuthMode(): 'login' | 'register' {
  const location = useLocation();
  return location.pathname.startsWith('/register') ? 'register' : 'login';
}

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const registerSchema = z.object({
  full_name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  accept_rules: z.literal(true, { errorMap: () => ({ message: 'Harus setuju dengan aturan trading' }) }),
});

type LoginInputs = z.infer<typeof loginSchema>;
type RegisterInputs = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { t } = useTranslation();
  const { referralCode } = useParams<{ referralCode: string }>();
  const mode = useAuthMode();
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, sendMagicLink } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const isLogin = mode === 'login';
  const schema = isLogin ? loginSchema : registerSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      referral_code: referralCode || '',
    },
  });

  const onSubmit = async (data: LoginInputs | RegisterInputs) => {
    setError(null);
    setIsSubmitting(true);
    try {
      if (isLogin) {
        const { error: err } = await signInWithEmail(
          (data as LoginInputs).email,
          (data as LoginInputs).password
        );
        if (err) setError(err.message);
      } else {
        const { error: err } = await signUpWithEmail(
          (data as RegisterInputs).email,
          (data as RegisterInputs).password,
          (data as RegisterInputs).full_name,
          referralCode
        );
        if (err) setError(err.message);
      }
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      const { error: err } = await signInWithGoogle();
      if (err) setError(err.message);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleMagicLink = async () => {
    // We need email for magic link — use a simple prompt approach
    const email = prompt(t('auth.email'));
    if (!email) return;
    setError(null);
    const { error: err } = await sendMagicLink(email);
    if (err) {
      setError(err.message);
    } else {
      setMagicLinkSent(true);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-garda-cyan">Garda</Link>
          <p className="mt-2 text-garda-text-secondary text-sm">{t('app.tagline')}</p>
        </div>

        {/* Card */}
        <div className="garda-card p-6">
          {/* Tabs */}
          <div className="flex bg-garda-input rounded-lg p-1 mb-6">
            <Link
              to="/login"
              className={`flex-1 text-center py-2 rounded-md text-sm font-medium transition-colors ${
                isLogin ? 'bg-garda-cyan text-[#0A0A14]' : 'text-garda-text-secondary'
              }`}
            >
              {t('auth.login')}
            </Link>
            <Link
              to="/register"
              className={`flex-1 text-center py-2 rounded-md text-sm font-medium transition-colors ${
                !isLogin ? 'bg-garda-cyan text-[#0A0A14]' : 'text-garda-text-secondary'
              }`}
            >
              {t('auth.register')}
            </Link>
          </div>

          {/* Google Button — Main CTA */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-garda-border hover:border-garda-border-hover bg-white text-gray-800 font-medium transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            </svg>
            {isLogin ? t('auth.google') : t('auth.google_register')}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-garda-border" />
            <span className="text-xs text-garda-text-muted uppercase">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-garda-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-pink/10 border border-garda-pink/20 text-garda-pink text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Magic link success */}
            {magicLinkSent && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-cyan/10 border border-garda-cyan/20 text-garda-cyan text-sm">
                <Check className="w-4 h-4 shrink-0" />
                {t('auth.magic_link_sent')}
              </div>
            )}

            {/* Full name (register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-garda-text-secondary mb-1.5">
                  {t('auth.full_name')}
                </label>
                <input
                  {...register('full_name')}
                  type="text"
                  className="garda-input w-full"
                  placeholder="Ezra"
                />
                {errors.full_name && (
                  <p className="mt-1 text-xs text-garda-pink">{errors.full_name.message as string}</p>
                )}
              </div>
            )}

            {/* Referral (register only, read-only if from link) */}
            {!isLogin && referralCode && (
              <div>
                <label className="block text-sm font-medium text-garda-text-secondary mb-1.5">
                  Kode Referral
                </label>
                <input
                  type="text"
                  value={referralCode}
                  readOnly
                  className="garda-input w-full bg-garda-surface cursor-not-allowed"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-garda-text-secondary mb-1.5">
                {t('auth.email')}
              </label>
              <input
                {...register('email')}
                type="email"
                className="garda-input w-full"
                placeholder="ezra@email.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-garda-pink">{errors.email.message as string}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-garda-text-secondary mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="garda-input w-full pr-10"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-garda-text-muted hover:text-garda-text-secondary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-garda-pink">{errors.password.message as string}</p>
              )}
              {!isLogin && (
                <p className="mt-1 text-xs text-garda-text-muted">Minimal 8 karakter</p>
              )}
            </div>

            {/* Accept rules (register only) */}
            {!isLogin && (
              <div className="flex items-start gap-2">
                <input
                  {...register('accept_rules')}
                  type="checkbox"
                  className="mt-1 rounded border-garda-border"
                />
                <label className="text-sm text-garda-text-secondary">
                  {t('onboarding.accept')}
                </label>
                {errors.accept_rules && (
                  <p className="text-xs text-garda-pink">{errors.accept_rules.message as string}</p>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="garda-btn-primary w-full"
            >
              {isSubmitting
                ? t('common.loading')
                : isLogin
                  ? t('auth.login')
                  : t('auth.register_free')}
            </button>
          </form>

          {/* Magic Link */}
          <button
            onClick={handleMagicLink}
            className="w-full text-center mt-4 text-sm text-garda-text-muted hover:text-garda-text-secondary transition-colors"
          >
            {t('auth.magic_link')}
          </button>

          {/* Toggle login/register */}
          <div className="mt-6 text-center text-sm text-garda-text-secondary">
            {isLogin ? (
              <>
                {t('auth.no_account')}{' '}
                <Link to="/register" className="text-garda-cyan hover:underline font-medium">
                  {t('auth.register_free')}
                </Link>
              </>
            ) : (
              <>
                {t('auth.has_account')}{' '}
                <Link to="/login" className="text-garda-cyan hover:underline font-medium">
                  {t('auth.login')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
