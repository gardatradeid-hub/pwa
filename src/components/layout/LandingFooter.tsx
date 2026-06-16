import { useTranslation } from 'react-i18next';

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="bg-garda-surface border-t border-garda-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-garda-cyan">Garda</span>
            <span className="text-sm text-garda-text-muted">— {t('app.tagline')}</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-garda-text-secondary">
            <a href="#" className="hover:text-garda-text transition-colors">Terms</a>
            <a href="#" className="hover:text-garda-text transition-colors">Privacy</a>
            <a href="#" className="hover:text-garda-text transition-colors">Contact</a>
          </div>

          <p className="text-sm text-garda-text-muted">
            {t('landing.footer_copy')}
          </p>
        </div>
      </div>
    </footer>
  );
}
