import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { weeks } from '@/lib/content';
import { lastVisitedStore, settingsStore, useStore, type Settings } from '@/lib/storage';
import { SearchPalette, useSearchShortcut } from './SearchPalette';

function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

const THEME_LABEL: Record<Settings['theme'], string> = { system: 'Auto', light: 'Light', dark: 'Dark' };
const THEME_ICON: Record<Settings['theme'], string> = { system: '◐', light: '☀', dark: '☾' };
const NEXT: Record<Settings['theme'], Settings['theme']> = { system: 'light', light: 'dark', dark: 'system' };

export function Layout() {
  const settings = useStore(settingsStore);
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpenRaw] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const setSearchOpen = useCallback((o: boolean) => {
    if (o) returnFocus.current = document.activeElement as HTMLElement | null;
    else requestAnimationFrame(() => returnFocus.current?.focus?.());
    setSearchOpenRaw(o);
  }, []);
  useSearchShortcut(setSearchOpen);
  const loc = useLocation();

  useEffect(() => applyTheme(settings.theme), [settings.theme]);
  useEffect(() => {
    setMenu(false);
    if (!loc.hash) window.scrollTo({ top: 0 });
    else {
      // Wait for lazy content, then scroll to the anchor.
      const id = decodeURIComponent(loc.hash.slice(1));
      let tries = 0;
      const t = window.setInterval(() => {
        const el = document.getElementById(id);
        if (el || ++tries > 40) {
          window.clearInterval(t);
          el?.scrollIntoView({ block: 'start' });
        }
      }, 50);
      return () => window.clearInterval(t);
    }
  }, [loc.pathname, loc.hash]);

  const nav = (
    <>
      <NavLink to="/" end>
        Home
      </NavLink>
      {weeks.map((w) => (
        <NavLink key={w.week} to={`/week/${w.week}`} className="nav__week">
          W{w.week}
        </NavLink>
      ))}
      <NavLink to="/practice">Practice</NavLink>
      <NavLink to="/formulas">Formulas</NavLink>
      <NavLink to="/glossary">Glossary</NavLink>
      <NavLink to="/foundations">Foundations</NavLink>
    </>
  );

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="header">
        <div className="header__inner">
          <Link to="/" className="brand" aria-label="PV Fundamentals home">
            <span className="brand__mark" aria-hidden>
              <svg viewBox="0 0 32 32" width="26" height="26">
                <rect width="32" height="32" rx="8" fill="var(--accent-strong)" />
                <circle cx="16" cy="13" r="5" fill="var(--dg-photon)" />
                <path d="M7 24h18M10 20h12" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="brand__text">
              PV Fundamentals<span className="brand__sub">SET4376</span>
            </span>
          </Link>
          <nav className="nav nav--desktop" aria-label="Main">
            {nav}
          </nav>
          <div className="header__tools">
            <button type="button" className="tool-btn search-btn" onClick={() => setSearchOpen(true)} aria-label="Search the site (Ctrl+K)" title="Search (⌘K / Ctrl+K)">
              <span aria-hidden>⌕</span> <span className="tool-btn__text">Search</span>
              <kbd className="search-btn__kbd">⌘K</kbd>
            </button>
            <button
              type="button"
              className={`tool-btn ${settings.beginner ? 'is-on' : ''}`}
              aria-pressed={settings.beginner}
              title="Beginner mode: more inline hints, 'why' steps open by default, Foundations links after mistakes"
              onClick={() => settingsStore.set((s) => ({ ...s, beginner: !s.beginner }))}
            >
              <span aria-hidden>✦</span> <span className="tool-btn__text">Beginner</span>
            </button>
            <button
              type="button"
              className="tool-btn"
              aria-label={`Theme: ${THEME_LABEL[settings.theme]}. Switch to ${THEME_LABEL[NEXT[settings.theme]]}`}
              title={`Theme: ${THEME_LABEL[settings.theme]}`}
              onClick={() => settingsStore.set((s) => ({ ...s, theme: NEXT[s.theme] }))}
            >
              <span aria-hidden>{THEME_ICON[settings.theme]}</span> <span className="tool-btn__text">{THEME_LABEL[settings.theme]}</span>
            </button>
            <button type="button" className="tool-btn nav-toggle" aria-expanded={menu} aria-controls="mobile-nav" onClick={() => setMenu((m) => !m)}>
              <span aria-hidden>☰</span>
              <span className="visually-hidden">Menu</span>
            </button>
          </div>
        </div>
        {menu && (
          <nav id="mobile-nav" className="nav nav--mobile" aria-label="Main">
            {nav}
          </nav>
        )}
      </header>
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer__inner">
          <span>Study notes built from the PV Fundamentals lectures, instruction sessions and the book <em>Solar Energy</em> (Smets et al.).</span>
          <Link to="/style-guide">Style guide</Link>
        </div>
      </footer>
    </div>
  );
}

export function useTrackVisit(title: string) {
  const loc = useLocation();
  useEffect(() => {
    lastVisitedStore.set({ last: { path: loc.pathname + loc.hash, title, at: Date.now() } });
  }, [loc.pathname, loc.hash, title]);
}
