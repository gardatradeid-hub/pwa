import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { Moon, Sun, Globe, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LandingNavbar() {
  const { t } = useTranslation();
  const { isDark, toggleTheme, mounted } = useTheme();
  const { lang, setLang } = useAppStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const switchLang = () => {
    const newLang = lang === 'id' ? 'en' : 'id';
    setLang(newLang);
    localStorage.setItem('garda-lang', newLang);
    window.location.reload();
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-garda-bg/95 backdrop-blur-md border-b border-garda-border'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl font-bold text-garda-cyan">
              Garda
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            <a href="#features" className="text-sm text-garda-text-secondary hover:text-garda-text transition-colors">
              {t('landing.features_title').substring(0, 20)}...
            </a>
            <a href="#how" className="text-sm text-garda-text-secondary hover:text-garda-text transition-colors">
              {t('landing.how_title')}
            </a>
            <a href="#pricing" className="text-sm text-garda-text-secondary hover:text-garda-text transition-colors">
              {t('landing.pricing_title')}
            </a>
            <a href="#faq" className="text-sm text-garda-text-secondary hover:text-garda-text transition-colors">
              FAQ
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={switchLang}
              className="p-2 rounded-lg text-garda-text-secondary hover:text-garda-text hover:bg-garda-surface transition-colors"
              title={t('common.switch_lang')}
            >
              <Globe className="w-4 h-4" />
              <span className="ml-1 text-xs font-medium uppercase">{lang}</span>
            </button>

            {/* Theme toggle */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-garda-text-secondary hover:text-garda-text hover:bg-garda-surface transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            {/* Auth buttons */}
            <Link to="/login" className="text-sm text-garda-text-secondary hover:text-garda-text transition-colors px-3 py-2">
              {t('auth.login')}
            </Link>
            <Link to="/register" className="garda-btn-primary text-sm py-2 px-4">
              {t('auth.register_free')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-garda-text"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-garda-border bg-garda-bg/95 backdrop-blur-md">
          <div className="px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-garda-text-secondary">
              Features
            </a>
            <a href="#how" onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-garda-text-secondary">
              {t('landing.how_title')}
            </a>
            <Link to="/login" onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-garda-text-secondary">
              {t('auth.login')}
            </Link>
            <Link to="/register" onClick={() => setMobileOpen(false)} className="block garda-btn-primary text-center w-full">
              {t('auth.register_free')}
            </Link>
            <div className="flex items-center gap-2 pt-2">
              <button onClick={switchLang} className="p-2 rounded-lg text-garda-text-secondary hover:text-garda-text">
                <Globe className="w-4 h-4" />
              </button>
              {mounted && (
                <button onClick={toggleTheme} className="p-2 rounded-lg text-garda-text-secondary">
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
