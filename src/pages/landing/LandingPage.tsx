import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, TrendingUp, Zap, Clock, Lock, Check,
  ArrowRight, ChevronDown, ChevronUp, Sparkles, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ================================================================
   SECTION 1 — HERO
   ================================================================ */
function HeroSection() {
  const { t } = useTranslation();
  return (
    <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-garda-cyan/10 border border-garda-cyan/20 text-sm text-garda-cyan mb-6 font-medium">
          <Sparkles className="w-4 h-4" />
          {t('landing.badge')}
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
          {t('landing.hero_headline')}
        </h1>

        {/* Subheadline */}
        <p className="mt-6 text-lg text-garda-text-secondary max-w-2xl mx-auto leading-relaxed">
          {t('landing.hero_subheadline')}
        </p>

        {/* Stats row */}
        <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-garda-text-muted">
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-garda-cyan" /> {t('landing.trust_funds')}
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-garda-cyan" /> {t('landing.trust_api')}
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-garda-cyan" /> {t('landing.trust_exchanges')}
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-garda-cyan" /> {t('landing.trust_free')}
          </span>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="garda-btn-primary text-lg py-3.5 px-8 w-full sm:w-auto">
            {t('landing.cta')} <ArrowRight className="inline w-4 h-4 ml-1" />
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
    { icon: TrendingUp, title: t('landing.problem_revenge_title'), desc: t('landing.problem_revenge_desc'), color: 'text-garda-pink', bg: 'bg-garda-pink/5', border: 'border-garda-pink/20' },
    { icon: Zap, title: t('landing.problem_over_title'), desc: t('landing.problem_over_desc'), color: 'text-garda-amber', bg: 'bg-garda-amber/5', border: 'border-garda-amber/20' },
    { icon: AlertTriangle, title: t('landing.problem_emotion_title'), desc: t('landing.problem_emotion_desc'), color: 'text-garda-pink', bg: 'bg-garda-pink/5', border: 'border-garda-pink/20' },
  ];
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-garda-surface">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.problem_title')}
        </h2>
        <p className="mt-4 text-garda-text-secondary text-center max-w-xl mx-auto">
          {t('landing.problem_subtitle')}
        </p>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <div key={i} className={cn('garda-card p-6 border hover:border-garda-border-hover transition-colors', p.border)}>
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-4', p.bg)}>
                <p.icon className={cn('w-5 h-5', p.color)} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
              <p className="text-garda-text-secondary text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-garda-amber font-medium">
          {t('landing.problem_closing')}
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 3 — HOW GARDA WORKS
   ================================================================ */
function HowItWorksSection() {
  const { t } = useTranslation();
  const steps = [
    { step: '01', icon: TrendingUp, title: t('landing.how_connect_title'), desc: t('landing.how_connect_desc') },
    { step: '02', icon: Shield, title: t('landing.how_trade_title'), desc: t('landing.how_trade_desc') },
    { step: '03', icon: Lock, title: t('landing.how_protect_title'), desc: t('landing.how_protect_desc') },
    { step: '04', icon: Clock, title: t('landing.how_cycle_title'), desc: t('landing.how_cycle_desc') },
  ];
  return (
    <section id="how" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.how_title')}
        </h2>
        <div className="mt-12 space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-4 garda-card p-5 group hover:border-garda-cyan/20 transition-all">
              <div className="w-11 h-11 rounded-xl bg-garda-cyan/10 flex items-center justify-center shrink-0 group-hover:bg-garda-cyan/20 transition-colors">
                <s.icon className="w-5 h-5 text-garda-cyan" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{s.title}</h3>
                <p className="text-sm text-garda-text-secondary mt-1 leading-relaxed">{s.desc}</p>
              </div>
              <span className="text-2xl font-bold text-garda-cyan/15 font-mono-num shrink-0">{s.step}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 4 — GARDA vs EXCHANGE
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
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-garda-surface">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.vs_title')}
        </h2>
        <p className="mt-4 text-garda-text-secondary text-center max-w-xl mx-auto">
          {t('landing.vs_subtitle')}
        </p>

        <div className="mt-10 garda-card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-garda-border text-garda-text-muted text-[11px] uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">{t('landing.vs_col_feature')}</th>
                <th className="text-center py-3 px-4 font-medium">{t('landing.vs_without_label')}</th>
                <th className="text-center py-3 px-4 font-medium text-garda-cyan">Garda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-garda-border">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-garda-surface/30 transition-colors">
                  <td className="py-3.5 px-4 font-medium">{r.label}</td>
                  <td className="py-3.5 px-4 text-center text-garda-text-muted">{r.without}</td>
                  <td className="py-3.5 px-4 text-center text-garda-cyan font-semibold">{r.garda}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-center text-garda-amber font-medium text-sm">
          {t('landing.vs_closing')}
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 5 — TRUST & SECURITY + EXCHANGES
   ================================================================ */
function TrustSection() {
  const { t } = useTranslation();
  const items = [
    t('landing.sec_funds'),
    t('landing.sec_no_asset'),
    t('landing.sec_no_withdraw'),
    t('landing.sec_read_trade'),
    t('landing.sec_cannot_withdraw'),
  ];
  const exchanges = [
    'Bybit', 'Binance', 'OKX', 'Bitget', 'KuCoin', 'MEXC',
    'Gate.io', 'BingX', 'BitMEX', 'Kraken', 'Huobi', 'CoinEx',
    'Deribit', 'Bitfinex', 'Phemex', 'WhiteBIT', 'WOO X',
  ];
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* Left: security */}
          <div>
            <Shield className="w-8 h-8 text-garda-cyan mb-4" />
            <h2 className="text-2xl font-bold">{t('landing.sec_title')}</h2>
            <ul className="mt-6 space-y-4">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-garda-cyan mt-0.5 shrink-0" />
                  <span className="text-garda-text-secondary text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: exchanges */}
          <div>
            <h2 className="text-2xl font-bold">{t('landing.exchanges_title')}</h2>
            <p className="mt-2 text-garda-text-secondary text-sm">
              {t('landing.exchanges_count', { count: 17 })}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {exchanges.map((name) => (
                <span key={name} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-garda-surface border border-garda-border text-garda-text-secondary hover:border-garda-cyan/30 hover:text-garda-cyan transition-colors">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 6 — WHO IS THIS FOR
   ================================================================ */
function WhoSection() {
  const { t } = useTranslation();
  const fits = [
    t('landing.who_liq'),
    t('landing.who_revenge'),
    t('landing.who_stop'),
    t('landing.who_emotion'),
  ];
  const notFits = [
    t('landing.who_not_signal'),
    t('landing.who_not_leverage'),
    t('landing.who_not_allin'),
    t('landing.who_not_limit'),
  ];
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-garda-surface">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.who_title')}
        </h2>
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          {/* Fits */}
          <div className="garda-card p-6 border-garda-cyan/20">
            <h3 className="font-semibold text-garda-cyan mb-4 text-lg flex items-center gap-2">
              <Check className="w-5 h-5" /> {t('landing.who_fits')}
            </h3>
            <ul className="space-y-3">
              {fits.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-garda-text-secondary">
                  <Check className="w-4 h-4 text-garda-cyan mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Not fits */}
          <div className="garda-card p-6 border-garda-pink/20">
            <h3 className="font-semibold text-garda-pink mb-4 text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> {t('landing.who_not_title')}
            </h3>
            <ul className="space-y-3">
              {notFits.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-garda-text-secondary">
                  <span className="text-garda-pink mt-0.5 shrink-0">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 7 — FAQ
   ================================================================ */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="garda-card group hover:border-garda-border-hover transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full cursor-pointer py-3 px-1 flex items-center justify-between font-medium text-left text-sm"
      >
        <span>{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-garda-cyan shrink-0 ml-2" />
          : <ChevronDown className="w-4 h-4 text-garda-text-muted shrink-0 ml-2 group-hover:text-garda-text-secondary transition-colors" />
        }
      </button>
      {open && (
        <div className="px-1 pb-4 text-garda-text-secondary text-sm leading-relaxed">
          {a.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
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
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.faq_title')}
        </h2>
        <div className="mt-12 space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 8 — FINAL CTA
   ================================================================ */
function FinalCTA() {
  const { t } = useTranslation();
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-garda-surface">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold">
          {t('landing.final_headline')}
        </h2>
        <p className="mt-4 text-garda-text-secondary max-w-xl mx-auto leading-relaxed">
          {t('landing.final_subheadline')}
        </p>
        <Link to="/register" className="mt-8 inline-block garda-btn-primary text-lg py-3.5 px-10">
          {t('landing.cta')} <ArrowRight className="inline w-4 h-4 ml-1" />
        </Link>
      </div>
    </section>
  );
}

/* ================================================================
   MAIN LANDING PAGE
   ================================================================ */
export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <ComparisonSection />
      <TrustSection />
      <WhoSection />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
