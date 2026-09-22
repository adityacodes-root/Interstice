'use client';

import React, { useState, useEffect } from 'react';
import { useIntersticeStore, ExplorationMode } from '@/store/useIntersticeStore';

interface AppLayoutProps {
  children: React.ReactNode;
}

const MODES: { id: ExplorationMode; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'contrarian', label: 'Contrarian' },
  { id: 'technical', label: 'Technical' },
  { id: 'historical', label: 'Historical' },
  { id: 'business', label: 'Business' },
  { id: 'philosophical', label: 'Philosophical' },
];

const getModeColor = (mode: string): string => {
  const colors: Record<string, string> = {
    default: 'rgb(96, 165, 250)',
    technical: 'rgb(34, 211, 238)',
    historical: 'rgb(251, 191, 36)',
    business: 'rgb(52, 211, 153)',
    philosophical: 'rgb(167, 139, 250)',
    contrarian: 'rgb(251, 146, 60)',
  };
  return colors[mode] || 'rgb(96, 165, 250)';
};

export default function AppLayout({ children }: AppLayoutProps) {
  const {
    activePage,
    setActivePage,
    nodes,
    explorationMode,
    setExplorationMode,
    history,
    resetGraph,
    notification,
    setNotification,
  } = useIntersticeStore();

  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [localNotification, setLocalNotification] = useState<{ message: string; mode: string } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = document.cookie
      .split('; ')
      .find(row => row.startsWith('interstice_theme='))
      ?.split('=')[1];
    if (saved === 'light') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.cookie = `interstice_theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
  };

  useEffect(() => {
    if (notification) {
      setLocalNotification(notification);
      setToastVisible(true);

      const hideTimeout = setTimeout(() => {
        setToastVisible(false);
      }, 3000);

      return () => clearTimeout(hideTimeout);
    } else {
      setToastVisible(false);
    }
  }, [notification]);

  useEffect(() => {
    if (!toastVisible && localNotification) {
      const cleanTimeout = setTimeout(() => {
        setLocalNotification(null);
        setNotification(null);
      }, 350);

      return () => clearTimeout(cleanTimeout);
    }
  }, [toastVisible, localNotification, setNotification]);

  const hasGraph = nodes.length > 0;
  const recentItems = history.slice(0, 6);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">

      <header className="h-11 flex-shrink-0 flex items-center justify-between md:justify-start border-b border-[var(--border)] px-4 sm:px-6 gap-3 sm:gap-6 md:gap-8 z-40 bg-[var(--bg)]">

        <button
          onClick={() => {
            setActivePage('landing');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2 cursor-pointer group text-[var(--logo-color)] hover:opacity-85 transition-opacity"
        >
          <svg
            viewBox="0 0 380 100"
            className="h-7 sm:h-8 w-auto fill-current"
          >
            <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
              <line x1="24" y1="60" x2="72" y2="32" />
              <line x1="24" y1="60" x2="56" y2="76" />
              <line x1="56" y1="76" x2="72" y2="32" />
            </g>
            <circle cx="24" cy="60" r="8.5" fill="currentColor" />
            <circle cx="72" cy="32" r="10.5" fill="currentColor" />
            <circle cx="56" cy="76" r="13.5" fill="currentColor" />
            <text
              x="105"
              y="68"
              fontFamily="var(--font-dm-serif), 'DM Serif Display', Georgia, serif"
              fontSize="52"
              fill="currentColor"
              letterSpacing="1"
            >
              Interstice
            </text>
          </svg>
        </button>

        <nav className="hidden md:flex items-center gap-1 flex-1">
          {[
            { id: 'landing' as const, label: 'New Exploration' },
            { id: 'explore' as const, label: 'Graph', disabled: !hasGraph },
            { id: 'connection-finder' as const, label: 'Connection Finder' },
            { id: 'saved' as const, label: 'Saved' },
          ].map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => setActivePage(item.id)}
                className={[
                  'px-3 py-1 text-[11px] rounded transition-colors duration-150 cursor-pointer font-mono tracking-tight',
                  isActive
                    ? 'text-[var(--text)] bg-[var(--border)] font-medium'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-panel)]',
                  item.disabled ? 'opacity-30 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2 select-none">
          <button
            onClick={() => setShowHelp(true)}
            className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer px-2.5 py-1 rounded hover:bg-[var(--bg-panel)] font-mono font-medium"
          >
            ? Help
          </button>
          {mounted && (
            <button
              onClick={toggleTheme}
              className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer px-2.5 py-1 rounded hover:bg-[var(--bg-panel)] font-mono font-medium"
            >
              {theme === 'light' ? '☼ Light' : '☾ Dark'}
            </button>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          {mounted && (
            <button
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer p-1.5 rounded hover:bg-[var(--bg-panel)] font-mono"
            >
              {theme === 'light' ? '☼' : '☾'}
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer rounded hover:bg-[var(--bg-panel)] flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-11 z-40 flex flex-col bg-[var(--bg-sidebar)] border-b border-[var(--border)] overflow-y-auto animate-fade-in">
          <div className="p-4 border-b border-[var(--border)] flex flex-col gap-1">
            <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] mb-1 font-mono font-medium">
              Navigation
            </span>
            {[
              { id: 'landing' as const, label: 'New Exploration' },
              { id: 'explore' as const, label: 'Graph', disabled: !hasGraph },
              { id: 'connection-finder' as const, label: 'Connection Finder' },
              { id: 'saved' as const, label: 'Saved' },
            ].map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  disabled={item.disabled}
                  onClick={() => {
                    setActivePage(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={[
                    'text-left py-2 px-3 text-xs rounded transition-colors duration-150 cursor-pointer font-mono tracking-tight flex items-center justify-between',
                    isActive
                      ? 'text-[var(--text)] bg-[var(--border)] font-medium'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-panel)]',
                    item.disabled ? 'opacity-30 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="text-[10px] text-[var(--muted)]">Active</span>}
                </button>
              );
            })}
          </div>

          <div className="p-4 border-b border-[var(--border)] flex flex-col gap-1">
            <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] mb-2 font-mono font-medium">
              Mode
            </span>
            {activePage === 'connection-finder' ? (
              <div className="text-left text-xs py-2 px-3 rounded text-[var(--text)] bg-[var(--bg-panel)] font-semibold border border-[var(--border)] font-mono">
                Default
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {MODES.map((m) => {
                  const isActive = explorationMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setExplorationMode(m.id);
                        setMobileMenuOpen(false);
                      }}
                      className={[
                        'text-left text-xs py-2 px-3 rounded transition-colors cursor-pointer font-mono',
                        isActive
                          ? 'text-[var(--text)] bg-[var(--bg-panel)] font-semibold border border-[var(--border)]'
                          : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-panel)]',
                      ].join(' ')}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {mounted && recentItems.length > 0 && (
            <div className="p-4 border-b border-[var(--border)] flex flex-col gap-1">
              <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] mb-1 font-mono font-medium">
                Recent Explorations
              </span>
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage('saved');
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-xs text-[var(--muted)] hover:text-[var(--text)] py-1 transition-colors truncate cursor-pointer font-mono"
                >
                  {item.title}
                </button>
              ))}
            </div>
          )}

          <div className="p-4 flex items-center justify-between mt-auto">
            <button
              onClick={() => {
                setShowHelp(true);
                setMobileMenuOpen(false);
              }}
              className="text-xs uppercase tracking-widest text-[var(--muted)] hover:text-[var(--text)] font-mono"
            >
              ? Help
            </button>
            {hasGraph && (
              <button
                onClick={() => {
                  resetGraph();
                  setActivePage('landing');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)] font-mono"
              >
                ← New exploration
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        <aside className="hidden md:flex w-[200px] flex-shrink-0 border-r border-[var(--border)] flex-col overflow-hidden bg-[var(--bg-sidebar)]">

          <div className="p-5 flex flex-col gap-1 border-b border-[var(--border)]">
            <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] mb-2 font-mono font-medium">
              Mode
            </span>
            {activePage === 'connection-finder' ? (
              <div className="text-left text-[11px] py-1 px-0 text-[var(--text)] font-semibold border-l border-[var(--text)] pl-3 font-mono select-none">
                Default
              </div>
            ) : (
              MODES.map((m) => {
                const isActive = explorationMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setExplorationMode(m.id)}
                    className={[
                      'text-left text-[11px] py-1 px-0 transition-colors duration-100 cursor-pointer font-mono',
                      isActive
                        ? 'text-[var(--text)] font-semibold border-l border-[var(--text)] pl-3 -ml-0'
                        : 'text-[var(--muted)] hover:text-[var(--text)]',
                    ].join(' ')}
                  >
                    {m.label}
                  </button>
                );
              })
            )}
          </div>

          {mounted && recentItems.length > 0 && (
            <div className="p-5 flex flex-col gap-1 flex-1 overflow-y-auto">
              <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] mb-2 font-mono font-medium">
                Recent
              </span>
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePage('saved')}
                  className="text-left text-[10px] text-[var(--muted)] hover:text-[var(--text)] py-0.5 transition-colors truncate cursor-pointer font-mono"
                  title={item.title}
                >
                  {item.title}
                </button>
              ))}
            </div>
          )}

          {hasGraph && (
            <div className="p-5 border-t border-[var(--border)]">
              <button
                onClick={() => {
                  resetGraph();
                  setActivePage('landing');
                }}
                className="text-[11px] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer font-mono"
              >
                ← New exploration
              </button>
            </div>
          )}
        </aside>

        <main className="flex-1 overflow-hidden flex flex-col relative">
          {children}

          {localNotification && (
            <div
              className={[
                'absolute top-4 sm:top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3.5 sm:px-4.5 py-2 sm:py-2.5 rounded border backdrop-blur-md bg-[var(--bg-panel)]/95 shadow-lg pointer-events-none select-none border-[var(--border)] max-w-[90vw] sm:max-w-sm w-max',
                toastVisible ? 'animate-toast-in' : 'animate-toast-out',
              ].join(' ')}
            >
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: getModeColor(localNotification.mode) }}
              />
              <span className="text-[11px] sm:text-[11.5px] text-[var(--muted)] leading-none tracking-wide font-light">
                {localNotification.message.split('**').map((part, idx) =>
                  idx % 2 === 1 ? <strong key={idx} className="font-medium text-[var(--text)]">{part}</strong> : part
                )}
              </span>
            </div>
          )}
        </main>
      </div>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-[var(--bg-card)] border border-[var(--border)] max-w-lg w-[92vw] sm:w-[90%] max-h-[85vh] overflow-y-auto p-5 sm:p-8 rounded shadow-2xl flex flex-col gap-5 sm:gap-6"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <h2
                className="text-xl font-medium font-serif tracking-tight text-[var(--text)]"
                style={{ fontFamily: 'var(--font-dm-serif)' }}
              >
                How to Explore
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer text-xl font-mono leading-none"
              >
                &times;
              </button>
            </div>


            <div className="flex flex-col gap-6 text-[12.5px] text-[var(--muted)] leading-relaxed font-sans">


              <div className="flex flex-col gap-3">
                <span className="font-mono text-[9px] uppercase text-[var(--text)] font-semibold tracking-wider border-b border-[var(--border)] pb-1.5">
                  Graph Interactions & Gestures
                </span>

                <div className="grid grid-cols-1 gap-3.5 pt-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col">
                      <strong className="text-[var(--text)] font-medium text-[12.5px]">Select Concept</strong>
                      <span className="text-[11.5px] opacity-80">Focuses concept, displays Wikipedia summary, neighborhoods, and queries.</span>
                    </div>
                    <span className="font-mono text-[9px] bg-[var(--border)] px-2 py-0.5 rounded text-[var(--text)] shrink-0 font-medium tracking-wide uppercase select-none">
                      Click
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col">
                      <strong className="text-[var(--text)] font-medium text-[12.5px]">Expand Graph</strong>
                      <span className="text-[11.5px] opacity-80">Queries the AI model to discover and spawn related surrounding concepts.</span>
                    </div>
                    <span className="font-mono text-[9px] bg-[var(--border)] px-2 py-0.5 rounded text-[var(--text)] shrink-0 font-medium tracking-wide uppercase select-none">
                      Double-Click
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col">
                      <strong className="text-[var(--text)] font-medium text-[12.5px]">Rearrange Map</strong>
                      <span className="text-[11.5px] opacity-80">Reposition concept nodes manually to custom-organize your map layout.</span>
                    </div>
                    <span className="font-mono text-[9px] bg-[var(--border)] px-2 py-0.5 rounded text-[var(--text)] shrink-0 font-medium tracking-wide uppercase select-none">
                      Drag Node
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col">
                      <strong className="text-[var(--text)] font-medium text-[12.5px]">Navigate Workspace</strong>
                      <span className="text-[11.5px] opacity-80">Pan across the workspace or scroll to zoom in/out of the exploration graph.</span>
                    </div>
                    <span className="font-mono text-[9px] bg-[var(--border)] px-2 py-0.5 rounded text-[var(--text)] shrink-0 font-medium tracking-wide uppercase select-none">
                      Drag Canvas / Scroll
                    </span>
                  </div>
                </div>
              </div>


              <div className="flex flex-col gap-3">
                <span className="font-mono text-[9px] uppercase text-[var(--text)] font-semibold tracking-wider border-b border-[var(--border)] pb-1.5">
                  Core Features
                </span>

                <div className="flex flex-col gap-3 pt-1">
                  <div>
                    <strong className="text-[var(--text)] font-medium block">Exploration Lenses</strong>
                    <p className="text-[11.5px] opacity-85">
                      Shift active mode filters (e.g. Philosophical, Contrarian, Technical) on the sidebar to tailor how the AI maps out new concepts.
                    </p>
                  </div>

                  <div>
                    <strong className="text-[var(--text)] font-medium block">Connection Finder</strong>
                    <p className="text-[11.5px] opacity-85">
                      Enter any two unrelated ideas to discover an intellectual bridge mapping a logical connection chain directly onto your active canvas.
                    </p>
                  </div>
                </div>
              </div>

            </div>


            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHelp(false)}
                className="text-[10px] font-mono tracking-wider uppercase text-[var(--text)] border border-[var(--border)] px-4 py-2 hover:border-[var(--text)] hover:bg-[var(--bg-panel)] transition-all cursor-pointer rounded-sm"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
