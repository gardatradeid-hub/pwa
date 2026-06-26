import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, TrendingUp, Gauge, BookOpen, Globe, ArrowRight, Check,
  Zap, Clock, Sparkles, AlertTriangle, Heart, Lock, BarChart3,
  Wallet, RefreshCw, Users, Star, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ================================================================
   SECTION 1 — HERO
   ================================================================ */
function HeroSection() {
  const { t } = useTranslation();
  return (
    <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-garda-cyan/10 border border-garda-cyan/20 text-sm text-garda-cyan mb-8 font-medium">
          <Sparkles className="w-4 h-4" />
          {t('landing.badge')}
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
          {t('landing.hero_headline')}
        </h1>

        <p className="mt-6 text-lg text-garda-text-secondary max-w-2xl mx-auto leading-relaxed">
          {t('landing.hero_subheadline')}
        </p>

        {/* Trust row */}
        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-garda-text-muted">
          {[
            t('landing.trust_funds'),
            t('landing.trust_api'),
            t('landing.trust_exchanges'),
            t('landing.trust_free'),
          ].map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-garda-cyan" /> {item}
            </span>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="garda-btn-primary text-lg py-3.5 px-8 w-full sm:w-auto">
            {t('landing.cta')} <ArrowRight className="inline w-4 h-4 ml-1" />
          </Link>
          <p className="text-sm text-garda-text-muted">
            {t('landing.cta_sub')}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 2 — WHY GARDA EXISTS (Story Timeline)
   ================================================================ */
function WhyGardaSection() {
  const { t } = useTranslation();
  const steps = [
    { emoji: '😔', label: t('landing.story_loss') },
    { emoji: '😡', label: t('landing.story_revenge') },
    { emoji: '📈', label: t('landing.story_oversize') },
    { emoji: '💀', label: t('landing.story_liquidated') },
  ];
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-garda-surface">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold">
          {t('landing.why_title')}
        </h2>
        <p className="mt-4 text-garda-text-secondary max-w-xl mx-auto">
          {t('landing.why_subtitle')}
        </p>

        {/* Story timeline */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          {steps.map((s, i) => (
            <div key={i} className="flex sm:flex-col items-center gap-2 sm:gap-1">
              <span className="text-3xl">{s.emoji}</span>
              <span className="text-xs text-garda-text-secondary">{s.label}</span>
              {i < steps.length - 1 && (
                <span className="text-garda-pink font-bold text-lg hidden sm:block">↓</span>
              )}
            </div>
          ))}
        </div>

        <p className="mt-10 text-garda-amber font-medium text-lg">
          {t('landing.why_closing')}
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 3 — WHY NOT JUST USE BYBIT (Comparison)
   ================================================================ */
function WhyNotBybitSection() {
  const { t } = useTranslation();
  const rows = [
    { label: t('landing.vs_trades'), bybit: t('landing.vs_bybit_trades'), garda: t('landing.vs_garda_trades'), winner: 'garda' },
    { label: t('landing.vs_leverage'), bybit: t('landing.vs_bybit_leverage'), garda: t('landing.vs_garda_leverage'), winner: 'garda' },
    { label: t('landing.vs_cooldown'), bybit: t('landing.vs_bybit_cooldown'), garda: t('landing.vs_garda_cooldown'), winner: 'garda' },
    { label: t('landing.vs_protection'), bybit: t('landing.vs_bybit_protect'), garda: t('landing.vs_garda_protect'), winner: 'garda' },
    { label: t('landing.vs_lock'), bybit: t('landing.vs_bybit_lock'), garda: t('landing.vs_garda_lock'), winner: 'garda' },
  ];
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.vs_title')}
        </h2>
        <p className="mt-4 text-garda-text-secondary text-center max-w-xl mx-auto">
          {t('landing.vs_subtitle')}
        </p>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-garda-border text-garda-text-muted text-[11px] uppercase">
                <th className="text-left py-3 px-4 font-medium">{t('landing.vs_col_feature')}</th>
                <th className="text-center py-3 px-4 font-medium">Exchange</th>
                <th className="text-center py-3 px-4 font-medium text-garda-cyan">GARDA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-garda-border">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="py-3 px-4 font-medium">{r.label}</td>
                  <td className="py-3 px-4 text-center text-garda-text-secondary">{r.bybit}</td>
                  <td className="py-3 px-4 text-center text-garda-cyan font-medium">{r.garda}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-center font-medium text-garda-amber">
          {t('landing.vs_closing')}
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 4 — THE REAL PROBLEM
   ================================================================ */
function ProblemSection() {
  const { t } = useTranslation();
  const problems = [
    { icon: TrendingUp, title: t('landing.problem_revenge_title'), desc: t('landing.problem_revenge_desc'), color: 'text-garda-pink', bg: 'bg-garda-pink/10' },
    { icon: Zap, title: t('landing.problem_over_title'), desc: t('landing.problem_over_desc'), color: 'text-garda-amber', bg: 'bg-garda-amber/10' },
    { icon: Gauge, title: t('landing.problem_emotion_title'), desc: t('landing.problem_emotion_desc'), color: 'text-garda-pink', bg: 'bg-garda-pink/10' },
  ];
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-garda-surface">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.problem_title')}
        </h2>
        <p className="mt-4 text-garda-text-secondary text-center max-w-xl mx-auto">
          {t('landing.problem_subtitle')}
        </p>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <div key={i} className="garda-card p-6 hover:border-garda-border-hover transition-colors">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-4', p.bg)}>
                <p.icon className={cn('w-5 h-5', p.color)} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
              <p className="text-garda-text-secondary text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-garda-amber font-medium text-lg">
          {t('landing.problem_closing')}
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 5 — PRODUCT PREVIEW (Screenshots / Placeholders)
   ================================================================ */
function ProductPreviewSection() {
  const { t } = useTranslation();
  const screens = [
    { title: t('landing.preview_trade'), desc: t('landing.preview_trade_desc') },
    { title: t('landing.preview_cooldown'), desc: t('landing.preview_cooldown_desc') },
    { title: t('landing.preview_lock'), desc: t('landing.preview_lock_desc') },
  ];
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.preview_title')}
        </h2>
        <p className="mt-4 text-garda-text-secondary text-center max-w-xl mx-auto">
          {t('landing.preview_subtitle')}
        </p>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {screens.map((s, i) => (
            <div key={i} className="garda-card p-6 text-center group hover:border-garda-cyan/20 transition-all">
              <div className="w-full h-48 rounded-lg bg-garda-input border border-garda-border flex items-center justify-center mb-4">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-garda-cyan/10 flex items-center justify-center mx-auto mb-2">
                    <BarChart3 className="w-8 h-8 text-garda-cyan" />
                  </div>
                  <p className="text-[11px] text-garda-text-muted">{t('landing.preview_placeholder')}</p>
                </div>
              </div>
              <h3 className="font-semibold mb-1">{s.title}</h3>
              <p className="text-xs text-garda-text-secondary">{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-garda-cyan">
          {t('landing.preview_note')}
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 6 — HOW GARDA WORKS (Visual Flow)
   ================================================================ */
function HowItWorksSection() {
  const { t } = useTranslation();
  const steps = [
    { step: '01', icon: Globe, title: t('landing.how_connect_title'), desc: t('landing.how_connect_desc') },
    { step: '02', icon: TrendingUp, title: t('landing.how_trade_title'), desc: t('landing.how_trade_desc') },
    { step: '03', icon: Shield, title: t('landing.how_protect_title'), desc: t('landing.how_protect_desc') },
    { step: '04', icon: RefreshCw, title: t('landing.how_cycle_title'), desc: t('landing.how_cycle_desc') },
    { step: '05', icon: Lock, title: t('landing.how_lock_title'), desc: t('landing.how_lock_desc') },
  ];
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-garda-surface">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.how_title')}
        </h2>
        <div className="mt-12 space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-4 garda-card p-5">
              <div className="w-12 h-12 rounded-xl bg-garda-cyan/10 flex items-center justify-center shrink-0">
                <s.icon className="w-6 h-6 text-garda-cyan" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-garda-text-secondary mt-1">{s.desc}</p>
              </div>
              <span className="text-2xl font-bold text-garda-cyan/20 font-mono-num shrink-0">{s.step}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 7 — ACCOUNT PROTECTION SYSTEM
   ================================================================ */
function ProtectionSection() {
  const { t } = useTranslation();
  const cards = [
    { icon: Clock, title: t('landing.protect_cooldown_title'), desc: t('landing.protect_cooldown_desc'), outcome: t('landing.protect_cooldown_outcome') },
    { icon: Gauge, title: t('landing.protect_maxtrade_title'), desc: t('landing.protect_maxtrade_desc'), outcome: t('landing.protect_maxtrade_outcome') },
    { icon: Lock, title: t('landing.protect_lock_title'), desc: t('landing.protect_lock_desc'), outcome: t('landing.protect_lock_outcome') },
    { icon: TrendingUp, title: t('landing.protect_drawdown_title'), desc: t('landing.protect_drawdown_desc'), outcome: t('landing.protect_drawdown_outcome') },
  ];
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.protect_title')}
        </h2>
        <p className="mt-4 text-garda-text-secondary text-center max-w-xl mx-auto">
          {t('landing.protect_subtitle')}
        </p>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((c, i) => (
            <div key={i} className="garda-card p-5 hover:border-garda-cyan/20 transition-all">
              <div className="w-10 h-10 rounded-lg bg-garda-cyan/10 flex items-center justify-center mb-4">
                <c.icon className="w-5 h-5 text-garda-cyan" />
              </div>
              <h3 className="font-semibold mb-2">{c.title}</h3>
              <p className="text-xs text-garda-text-secondary leading-relaxed mb-3">{c.desc}</p>
              <p className="text-[11px] text-garda-cyan font-medium">{c.outcome}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 8 — SECURITY
   ================================================================ */
function SecuritySection() {
  const { t } = useTranslation();
  const items = [
    t('landing.sec_funds'),
    t('landing.sec_no_asset'),
    t('landing.sec_no_withdraw'),
    t('landing.sec_read_trade'),
    t('landing.sec_cannot_withdraw'),
  ];
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-garda-surface">
      <div className="max-w-3xl mx-auto text-center">
        <Shield className="w-12 h-12 text-garda-cyan mx-auto mb-6" />
        <h2 className="text-3xl sm:text-4xl font-bold">
          {t('landing.sec_title')}
        </h2>
        <div className="mt-10 garda-card p-8 inline-block text-left">
          <ul className="space-y-4">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-garda-cyan mt-0.5 shrink-0" />
                <span className="text-garda-text-secondary">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 9 — SUPPORTED EXCHANGES
   ================================================================ */
function ExchangesSection() {
  const { t } = useTranslation();
  // Updated from codebase: 17 exchanges supported
  const exchanges = [
    { name: 'Bybit', logo: '/exchanges/bybit.svg' },
    { name: 'Binance', logo: '/exchanges/binance.svg' },
    { name: 'OKX', logo: '/exchanges/okx.svg' },
    { name: 'Bitget', logo: '/exchanges/bitget.svg' },
    { name: 'KuCoin', logo: '/exchanges/kucoin.svg' },
    { name: 'MEXC', logo: '/exchanges/mexc.svg' },
    { name: 'Gate.io', logo: '/exchanges/gateio.svg' },
    { name: 'BingX', logo: '/exchanges/bingx.svg' },
    { name: 'BitMEX', logo: '/exchanges/bitmex.svg' },
    { name: 'Kraken', logo: '/exchanges/kraken.svg' },
    { name: 'Huobi', logo: '/exchanges/huobi.svg' },
    { name: 'CoinEx', logo: '/exchanges/coinex.svg' },
    { name: 'Deribit', logo: '/exchanges/deribit.svg' },
    { name: 'Bitfinex', logo: '/exchanges/bitfinex.svg' },
    { name: 'Phemex', logo: '/exchanges/phemex.svg' },
    { name: 'WhiteBIT', logo: '/exchanges/whitebit.svg' },
    { name: 'WOO X', logo: '/exchanges/woox.svg' },
  ];
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold">
          {t('landing.exchanges_title')}
        </h2>
        <p className="mt-4 text-garda-text-secondary">
          {t('landing.exchanges_count', { count: 17 })}
        </p>
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {exchanges.map((ex, i) => (
            <div key={i} className="garda-card p-4 flex flex-col items-center gap-2 hover:border-garda-cyan/20 transition-all">
              <img src={ex.logo} alt={ex.name} className="w-10 h-10 rounded-lg" />
              <span className="text-xs font-medium text-garda-text-secondary">{ex.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 10 — WHO IS THIS FOR
   ================================================================ */
function WhoSection() {
  const { t } = useTranslation();
  const fits = [
    t('landing.who_liq'),
    t('landing.who_revenge'),
    t('landing.who_stop'),
    t('landing.who_emotion'),
    t('landing.who_discipline'),
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
          <div className="garda-card p-6 border-garda-cyan/20">
            <h3 className="font-semibold text-garda-cyan mb-4 flex items-center gap-2">
              <Check className="w-5 h-5" /> {t('landing.who_fits')}
            </h3>
            <ul className="space-y-3">
              {fits.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-garda-text-secondary">
                  <Check className="w-4 h-4 text-garda-cyan mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="garda-card p-6 border-garda-pink/20">
            <h3 className="font-semibold text-garda-pink mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> {t('landing.who_not_title')}
            </h3>
            <ul className="space-y-3">
              {notFits.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-garda-text-secondary">
                  <span className="text-garda-pink mt-0.5 shrink-0">✗</span>
                  {item}
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
   SECTION 11 — SOCIAL PROOF (placeholder)
   ================================================================ */
function SocialProofSection() {
  const { t } = useTranslation();
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <Users className="w-10 h-10 text-garda-cyan mx-auto mb-4" />
        <h2 className="text-2xl font-bold">{t('landing.social_title')}</h2>
        <p className="mt-4 text-garda-text-secondary max-w-lg mx-auto">
          {t('landing.social_desc')}
        </p>
        <div className="mt-8 garda-card p-6 inline-block border-dashed border-garda-border">
          <Star className="w-6 h-6 text-garda-text-muted mx-auto mb-2" />
          <p className="text-sm text-garda-text-muted">{t('landing.social_placeholder')}</p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 12 — FAQ
   ================================================================ */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="garda-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full cursor-pointer list-none py-3 px-2 flex items-center justify-between font-medium text-left"
      >
        <span>{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-garda-text-muted shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-garda-text-muted shrink-0 ml-2" />}
      </button>
      {open && <p className="px-2 pb-4 text-garda-text-secondary text-sm leading-relaxed">{a}</p>}
    </div>
  );
}

function FAQSection() {
  const { t } = useTranslation();
  const faqs = [
    { q: t('landing.faq_why_3'), a: t('landing.faq_why_3_a') },
    { q: t('landing.faq_why_cool'), a: t('landing.faq_why_cool_a') },
    { q: t('landing.faq_why_lock'), a: t('landing.faq_why_lock_a') },
    { q: t('landing.faq_why_leverage'), a: t('landing.faq_why_leverage_a') },
    { q: t('landing.faq_bot'), a: t('landing.faq_bot_a') },
    { q: t('landing.faq_safe'), a: t('landing.faq_safe_a') },
    { q: t('landing.faq_withdraw'), a: t('landing.faq_withdraw_a') },
    { q: t('landing.faq_how_start'), a: t('landing.faq_how_start_a') },
  ];
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-garda-surface">
      <div className="max-w-3xl mx-auto">
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
   SECTION 13 — FINAL CTA
   ================================================================ */
function FinalCTA() {
  const { t } = useTranslation();
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <Heart className="w-10 h-10 text-garda-cyan mx-auto mb-6" />
        <h2 className="text-3xl sm:text-4xl font-bold">
          {t('landing.final_headline')}
        </h2>
        <p className="mt-4 text-garda-text-secondary max-w-xl mx-auto">
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
      <WhyGardaSection />
      <WhyNotBybitSection />
      <ProblemSection />
      <ProductPreviewSection />
      <HowItWorksSection />
      <ProtectionSection />
      <SecuritySection />
      <ExchangesSection />
      <WhoSection />
      <SocialProofSection />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
