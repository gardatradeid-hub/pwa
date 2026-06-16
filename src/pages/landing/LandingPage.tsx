import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, TrendingUp, Gauge, BookOpen, Globe, ArrowRight, Check, Zap, Clock, Sparkles } from 'lucide-react';

function HeroSection() {
  const { t } = useTranslation();
  return (
    <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-garda-cyan/10 border border-garda-cyan/20 text-sm text-garda-cyan mb-8 font-medium">
          <Sparkles className="w-4 h-4" />
          {t('app.tagline')}
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight whitespace-pre-line">
          <span className="text-garda-text">{t('landing.hero_title').split('\n')[0]}</span>
          {'\n'}
          <span className="text-garda-cyan">{t('landing.hero_title').split('\n')[1]}</span>
        </h1>
        <p className="mt-6 text-lg text-garda-text-secondary max-w-2xl mx-auto leading-relaxed">
          {t('landing.hero_subtitle')}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="garda-btn-primary text-lg py-3.5 px-8 w-full sm:w-auto">
            {t('landing.cta')} <ArrowRight className="inline w-4 h-4 ml-1" />
          </Link>
          <p className="text-sm text-garda-text-muted">
            {t('landing.cta_sub')}
          </p>
        </div>
        <p className="mt-6 text-sm text-garda-text-muted">
          {t('landing.traders_joined', { count: '1,000' })}
        </p>
      </div>
    </section>
  );
}

function ProblemSection() {
  const { t } = useTranslation();
  const problems = [
    { icon: TrendingUp, title: t('landing.problem_1_title'), desc: t('landing.problem_1_desc') },
    { icon: Zap, title: t('landing.problem_2_title'), desc: t('landing.problem_2_desc') },
    { icon: Gauge, title: t('landing.problem_3_title'), desc: t('landing.problem_3_desc') },
  ];

  return (
    <section id="problem" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.problem_title')}
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <div key={i} className="garda-card p-6 hover:border-garda-border-hover transition-colors">
              <div className="w-10 h-10 rounded-lg bg-garda-pink/10 flex items-center justify-center mb-4">
                <p.icon className="w-5 h-5 text-garda-pink" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
              <p className="text-garda-text-secondary text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-garda-amber font-medium">
          {t('landing.problem_closing')}
        </p>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const { t } = useTranslation();
  const features = [
    { icon: Shield, title: t('landing.f1_title'), desc: t('landing.f1_desc') },
    { icon: Clock, title: t('landing.f2_title'), desc: t('landing.f2_desc') },
    { icon: TrendingUp, title: t('landing.f3_title'), desc: t('landing.f3_desc') },
    { icon: BookOpen, title: t('landing.f4_title'), desc: t('landing.f4_desc') },
    { icon: Globe, title: t('landing.f5_title'), desc: t('landing.f5_desc') },
  ];

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-garda-surface">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.features_title')}
        </h2>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="garda-card p-6 hover:border-garda-border-hover transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-lg bg-garda-cyan/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-garda-cyan" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-garda-text-secondary text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const { t } = useTranslation();
  const steps = [
    { step: '01', title: t('landing.how_1'), desc: t('landing.how_1_desc') },
    { step: '02', title: t('landing.how_2'), desc: t('landing.how_2_desc') },
    { step: '03', title: t('landing.how_3'), desc: t('landing.how_3_desc') },
  ];

  return (
    <section id="how" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">
          {t('landing.how_title')}
        </h2>
        <div className="mt-12 flex flex-col gap-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-5 garda-card p-6">
              <span className="text-2xl font-bold text-garda-cyan font-mono-num shrink-0">{s.step}</span>
              <div>
                <h3 className="text-lg font-semibold mb-1">{s.title}</h3>
                <p className="text-garda-text-secondary text-sm">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const { t } = useTranslation();
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-garda-surface">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold">{t('landing.pricing_title')}</h2>
        <p className="mt-4 text-lg text-garda-text-secondary">{t('landing.pricing_desc')}</p>
        <div className="mt-8 garda-card p-8 inline-block">
          <div className="text-5xl font-bold text-garda-cyan font-mono-num">Rp 0</div>
          <p className="mt-2 text-garda-text-secondary">selamanya</p>
          <ul className="mt-6 space-y-3 text-left">
            {[
              'Auto Risk 1% per trade',
              'Cooling System (3 loss lock)',
              'Smart Journal otomatis',
              'Phase progression',
              'Multi-exchange: Bybit + Binance + OKX',
              'Statistik lengkap',
              'Full guardrail protection',
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-garda-cyan mt-0.5 shrink-0" />
                <span className="text-garda-text-secondary">{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-sm text-garda-amber">{t('landing.pricing_note')}</p>
      </div>
    </section>
  );
}

function FAQSection() {
  const { t } = useTranslation();
  const faqs = [
    { q: 'Apakah dana saya aman?', a: 'Ya. Garda tidak menyimpan dana Anda. Kami hanya memfasilitasi trading via API key Read + Trade. Dana tetap di exchange Anda.' },
    { q: 'Exchange apa yang didukung?', a: 'Bybit, Binance, dan OKX. Lebih banyak exchange akan ditambahkan.' },
    { q: 'Apakah ini benar-benar gratis?', a: 'Ya. Untuk 1,000 user pertama, Garda gratis selamanya. Early adopter akan dapat benefit khusus saat paket Pro hadir.' },
    { q: 'Kenapa leverage dikunci di 1x?', a: 'Leverage tinggi adalah penyebab utama trader pemula kalah. Dengan 1x, Anda trading spot dengan harga futures — lebih aman.' },
    { q: 'Bagaimana cara memulai?', a: 'Daftar dengan Google atau email, connect API key exchange Anda, dan langsung bisa trading.' },
  ];

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center">{t('landing.faq_title')}</h2>
        <div className="mt-12 space-y-4">
          {faqs.map((faq, i) => (
            <details key={i} className="garda-card group">
              <summary className="cursor-pointer list-none py-3 px-2 flex items-center justify-between font-medium">
                {faq.q}
                <span className="text-garda-text-muted group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="px-2 pb-4 text-garda-text-secondary text-sm leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const { t } = useTranslation();
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold">{t('landing.final_cta')}</h2>
        <Link to="/register" className="mt-8 inline-block garda-btn-primary text-lg py-3.5 px-10">
          {t('landing.cta')} <ArrowRight className="inline w-4 h-4 ml-1" />
        </Link>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
