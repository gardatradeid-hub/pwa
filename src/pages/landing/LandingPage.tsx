import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, TrendingUp, Zap, Clock, Lock, Check,
  ArrowRight, ChevronDown, ChevronUp, Sparkles, AlertTriangle,
  Globe, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ================================================================
   DESIGN LANGUAGE — Garda (soft, elegant, trust-focused)
   ================================================================
   Colors:   cyan=#00E5C3  pink=#FF0080  amber=#EF9F27
   Cards:    backdrop-blur-sm + subtle border + soft shadow
   Glow:     radial gradient behind hero headline
   Typography: Inter for body, JetBrains Mono for numbers
*/

/* ── Section wrapper helper ── */
function Section({ children, alt, className }: { children: React.ReactNode; alt?: boolean; className?: string }) {
  return (
    <section className={cn('py-24 px-4 sm:px-6 lg:px-8', alt ? 'bg-garda-surface/50' : '', className)}>
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

/* ================================================================
   SECTION 1 — HERO
   ================================================================ */
function HeroSection() {
  const { t } = useTranslation();
  return (
    <section className="relative pt-36 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Soft cyan glow behind headline */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-garda-cyan/5 blur-[120px] pointer-events-none" />

      <div className="relative max-w-3xl mx-auto text-center">
        {/* Badge — pill with glow */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-garda-cyan/10 border border-garda-cyan/25 text-sm text-garda-cyan mb-8 font-medium backdrop-blur-sm">
          <Sparkles className="w-4 h-4" />
          <span>{t('landing.badge')}</span>
        </div>

        {/* Headline — refined spacing */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight">
          <span className="block">{t('landing.hero_headline').split('\n')[0]}</span>
          <span className="block text-garda-cyan">{t('landing.hero_headline').split('\n')[1]}</span>
        </h1>

        <p className="mt-6 text-lg text-garda-text-secondary max-w-2xl mx-auto leading-relaxed">
          {t('landing.hero_subheadline')}
        </p>

        {/* Trust badges — soft glass cards */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {[t('landing.trust_funds'), t('landing.trust_api'), t('landing.trust_exchanges'), t('landing.trust_free')].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-garda-surface/70 backdrop-blur-sm border border-garda-border text-sm text-garda-text-secondary">
              <Check className="w-4 h-4 text-garda-cyan" />
              {item}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="inline-flex items-center gap-2 bg-garda-cyan hover:bg-garda-cyan/90 text-garda-bg font-semibold rounded-xl px-8 py-4 text-lg transition-all duration-200 shadow-lg shadow-garda-cyan/20 hover:shadow-garda-cyan/30 active:scale-[0.98]">
            {t('landing.cta')} <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-garda-text-muted">{t('landing.cta_sub')}</p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 2 — THE PROBLEM
   ================================================================ */
function ProblemSection() {
  const { t } = useTranslation();
  const problems = [
    { icon: TrendingUp, title: t('landing.problem_revenge_title'), desc: t('landing.problem_revenge_desc'), accent: 'garda-pink' },
    { icon: Zap, title: t('landing.problem_over_title'), desc: t('landing.problem_over_desc'), accent: 'garda-amber' },
    { icon: AlertTriangle, title: t('landing.problem_emotion_title'), desc: t('landing.problem_emotion_desc'), accent: 'garda-pink' },
  ];
  return (
    <Section alt>
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {t('landing.problem_title')}
        </h2>
        <p className="mt-4 text-garda-text-secondary max-w-xl mx-auto">
          {t('landing.problem_subtitle')}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {problems.map((p, i) => (
          <div key={i} className={cn(
            'group relative garda-card p-6 border transition-all duration-300',
            'hover:scale-[1.02] hover:shadow-xl',
            i === 0 && 'border-garda-pink/15 hover:border-garda-pink/30 hover:shadow-garda-pink/5',
            i === 1 && 'border-garda-amber/15 hover:border-garda-amber/30 hover:shadow-garda-amber/5',
            i === 2 && 'border-garda-pink/15 hover:border-garda-pink/30 hover:shadow-garda-pink/5',
          )}>
            {/* Icon with soft background */}
            <div className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center mb-5',
              'bg-garda-cyan/5 border border-garda-cyan/15',
            )}>
              <p.icon className={cn('w-5 h-5', p.accent === 'garda-pink' ? 'text-garda-pink' : 'text-garda-amber')} />
            </div>

            <h3 className="text-lg font-bold mb-2.5">{p.title}</h3>
            <p className="text-garda-text-secondary text-sm leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-garda-amber/80 font-medium text-sm">
        {t('landing.problem_closing')}
      </p>
    </Section>
  );
}

/* ================================================================
   SECTION 3 — HOW GARDA WORKS
   ================================================================ */
function HowItWorksSection() {
  const { t } = useTranslation();
  const steps = [
    { step: '1', icon: Globe, title: t('landing.how_connect_title'), desc: t('landing.how_connect_desc') },
    { step: '2', icon: TrendingUp, title: t('landing.how_trade_title'), desc: t('landing.how_trade_desc') },
    { step: '3', icon: Shield, title: t('landing.how_protect_title'), desc: t('landing.how_protect_desc') },
    { step: '4', icon: Clock, title: t('landing.how_cycle_title'), desc: t('landing.how_cycle_desc') },
  ];
  return (
    <Section>
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {t('landing.how_title')}
        </h2>
      </div>

      {/* Horizontal steps with connecting line */}
      <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Connecting line (desktop only) */}
        <div className="hidden lg:block absolute top-8 left-[12%] right-[12%] h-px bg-garda-border" />
        {steps.map((s, i) => (
          <div key={i} className="relative text-center group">
            {/* Step number circle */}
            <div className="relative z-10 w-16 h-16 mx-auto rounded-2xl bg-garda-cyan/10 border border-garda-cyan/20 flex items-center justify-center mb-5 group-hover:bg-garda-cyan/20 group-hover:border-garda-cyan/40 transition-all duration-300">
              <span className="text-xl font-bold text-garda-cyan font-mono-num">{s.step}</span>
            </div>
            <h3 className="font-bold text-sm mb-2">{s.title}</h3>
            <p className="text-garda-text-secondary text-xs leading-relaxed max-w-[220px] mx-auto">{s.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ================================================================
   SECTION 4 — COMPARISON TABLE (elegant card-style)
   ================================================================ */
function ComparisonSection() {
  const { t } = useTranslation();
  const rows = [
    { label: t('landing.vs_trades'), without: t('landing.vs_bybit_trades'), garda: t('landing.vs_garda_trades') },
    { label: t('landing.vs_leverage'), without: t('landing.vs_bybit_leverage'), garda: t('landing.vs_garda_leverage') },
    { label: t('landing.vs_cooldown'), without: t('landing.vs_bybit_cooldown'), garda: t('landing.vs_garda_cooldown') },
    { label: t('landing.vs_protection'), without: t('landing.vs_bybit_protect'), garda: t('landing.vs_garda_protect') },
    { label: t('landing.vs_lock'), without: t('landing.vs_bybit_lock'), garda: t('landing.vs_garda_lock') },
  ];
  return (
    <Section alt>
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {t('landing.vs_title')}
        </h2>
        <p className="mt-4 text-garda-text-secondary max-w-xl mx-auto">
          {t('landing.vs_subtitle')}
        </p>
      </div>

      {/* Card-style comparison — not a raw table */}
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center px-5 py-3 text-sm font-semibold text-garda-text-muted">
          <span className="flex-1">{t('landing.vs_col_feature')}</span>
          <span className="w-32 text-center">{t('landing.vs_without_label')}</span>
          <span className="w-32 text-center text-garda-cyan">Garda</span>
        </div>

        {rows.map((r, i) => (
          <div key={i} className="flex items-center px-5 py-4 rounded-xl bg-garda-surface/50 border border-garda-border hover:border-garda-cyan/20 transition-all duration-200">
            <span className="flex-1 font-medium text-sm">{r.label}</span>
            <span className="w-32 text-center text-garda-text-muted text-sm line-through decoration-garda-pink/30">{r.without}</span>
            <span className="w-32 text-center text-garda-cyan font-semibold text-sm">{r.garda}</span>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-garda-amber/70 text-sm font-medium">
        {t('landing.vs_closing')}
      </p>
    </Section>
  );
}

/* ================================================================
   SECTION 5 — TRUST & SECURITY
   ================================================================ */
function TrustSection() {
  const { t } = useTranslation();
  const pillars = [
    { icon: Wallet, title: t('landing.sec_funds'), desc: t('landing.sec_cannot_withdraw') },
    { icon: Shield, title: t('landing.sec_read_trade'), desc: t('landing.sec_no_withdraw') },
    { icon: Lock, title: t('landing.sec_no_asset'), desc: t('landing.sec_funds') },
  ];
  const exchanges = ['Bybit', 'Binance', 'OKX', 'Bitget', 'KuCoin', 'MEXC', 'Gate.io', 'BingX', 'BitMEX', 'Kraken', 'Huobi', 'CoinEx', 'Deribit', 'Bitfinex', 'Phemex', 'WhiteBIT', 'WOO X'];

  return (
    <Section>
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {t('landing.sec_title')}
        </h2>
      </div>

      {/* 3 trust pillars */}
      <div className="grid sm:grid-cols-3 gap-6 mb-16">
        {pillars.map((p, i) => (
          <div key={i} className="garda-card p-6 text-center border-garda-cyan/10 hover:border-garda-cyan/25 transition-all duration-300">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-garda-cyan/10 flex items-center justify-center mb-5">
              <p.icon className="w-6 h-6 text-garda-cyan" />
            </div>
            <h3 className="font-bold mb-2">{p.title}</h3>
            <p className="text-garda-text-secondary text-xs leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* Exchange badges */}
      <div className="text-center">
        <p className="text-garda-text-muted text-sm mb-4">{t('landing.exchanges_count', { count: 17 })}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {exchanges.map((name) => (
            <span key={name} className="px-3.5 py-2 rounded-xl text-[11px] font-medium bg-garda-surface border border-garda-border text-garda-text-secondary hover:border-garda-cyan/30 hover:text-garda-cyan transition-colors">
              {name}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ================================================================
   SECTION 6 — WHO IS THIS FOR
   ================================================================ */
function WhoSection() {
  const { t } = useTranslation();
  const fits = [t('landing.who_liq'), t('landing.who_revenge'), t('landing.who_stop'), t('landing.who_emotion')];
  const notFits = [t('landing.who_not_signal'), t('landing.who_not_leverage'), t('landing.who_not_allin'), t('landing.who_not_limit')];
  return (
    <Section alt>
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {t('landing.who_title')}
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {/* Cocok */}
        <div className="garda-card p-6 border-garda-cyan/15 bg-garda-cyan/[0.02]">
          <h3 className="font-bold text-garda-cyan mb-5 text-lg flex items-center gap-2">
            <Check className="w-5 h-5" /> {t('landing.who_fits')}
          </h3>
          <ul className="space-y-3">
            {fits.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-garda-text-secondary">
                <div className="w-5 h-5 rounded-full bg-garda-cyan/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-garda-cyan" />
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tidak Cocok */}
        <div className="garda-card p-6 border-garda-pink/10 bg-garda-pink/[0.01]">
          <h3 className="font-bold text-garda-pink mb-5 text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> {t('landing.who_not_title')}
          </h3>
          <ul className="space-y-3">
            {notFits.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-garda-text-secondary">
                <div className="w-5 h-5 rounded-full bg-garda-pink/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-garda-pink text-[10px] font-bold">✕</span>
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ================================================================
   SECTION 7 — FAQ
   ================================================================ */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn(
      'rounded-xl border transition-all duration-300 overflow-hidden',
      open
        ? 'border-garda-cyan/20 bg-garda-cyan/[0.02] shadow-sm'
        : 'border-garda-border bg-garda-surface/30 hover:border-garda-border-hover',
    )}>
      <button onClick={() => setOpen(!open)} className="w-full cursor-pointer py-5 px-5 flex items-center justify-between text-left">
        <span className="font-semibold text-sm pr-4">{q}</span>
        <div className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
          open ? 'bg-garda-cyan/10 text-garda-cyan' : 'bg-garda-surface text-garda-text-muted',
        )}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 text-garda-text-secondary text-sm leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

function FAQSection() {
  const { t } = useTranslation();
  const faqs = [
    { q: t('landing.faq_why_3'), a: t('landing.faq_why_3_a') },
    { q: t('landing.faq_why_cool'), a: t('landing.faq_why_cool_a') },
    { q: t('landing.faq_why_lock'), a: t('landing.faq_why_lock_a') },
    { q: t('landing.faq_bot'), a: t('landing.faq_bot_a') },
    { q: t('landing.faq_safe'), a: t('landing.faq_safe_a') },
  ];
  return (
    <Section>
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {t('landing.faq_title')}
        </h2>
      </div>
      <div className="max-w-2xl mx-auto space-y-3">
        {faqs.map((faq, i) => (
          <FAQItem key={i} q={faq.q} a={faq.a} />
        ))}
      </div>
    </Section>
  );
}

/* ================================================================
   SECTION 8 — FINAL CTA
   ================================================================ */
function FinalCTA() {
  const { t } = useTranslation();
  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Glow */}
      <div className="absolute inset-0 bg-garda-cyan/5 blur-[150px] rounded-full w-[600px] h-[300px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="relative max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
          {t('landing.final_headline')}
        </h2>
        <p className="mt-6 text-lg text-garda-text-secondary max-w-xl mx-auto leading-relaxed">
          {t('landing.final_subheadline')}
        </p>
        <Link to="/register" className="mt-10 inline-flex items-center gap-2 bg-garda-cyan hover:bg-garda-cyan/90 text-garda-bg font-bold rounded-xl px-10 py-4 text-lg transition-all duration-200 shadow-xl shadow-garda-cyan/25 hover:shadow-garda-cyan/40 active:scale-[0.98]">
          {t('landing.cta')} <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  );
}

/* ================================================================
   MAIN
   ================================================================ */
export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <ComparisonSection />
      <TrustSection />
      <WhoSection />
      <FAQSection />
      <FinalCTA />
    </div>
  );
}
