import React, { useState, useEffect } from 'react';
import { useIntersticeStore } from '@/store/useIntersticeStore';
import Dither from '@/components/ui/Dither';

const SUGGESTIONS = [
  'Kubernetes', 'Japanese Language', 'Quantum Physics',
  'Ancient Rome', 'Neuroplasticity', 'Epigenetics',
];

export default function LandingPage() {
  const {
    initGraph,
    isLoading,
    setActivePage,
  } = useIntersticeStore();

  const [topic, setTopic] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const getTheme = () => {
      const current = document.documentElement.getAttribute('data-theme');
      return current === 'light' ? 'light' : 'dark';
    };

    setTheme(getTheme());

    const observer = new MutationObserver(() => {
      setTheme(getTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const isLight = theme === 'light';
  const bgColor: [number, number, number] = isLight
    ? [0.98, 0.965, 0.933]
    : [0.039, 0.039, 0.039];
  const waveColor: [number, number, number] = isLight
    ? [0.80, 0.77, 0.68]
    : [0.15, 0.15, 0.17];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setErrorMsg('');
    const success = await initGraph(topic.trim());
    if (success) setActivePage('explore');
    else setErrorMsg('Could not start exploration. Ensure your server environment is configured and try again.');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)] relative">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <Dither
          colorBg={bgColor}
          colorFg={waveColor}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.14}
          waveFrequency={3}
          waveSpeed={0.01}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center px-12 md:px-20 max-w-4xl animate-fade-up relative z-10">

        <h1
          className="font-serif text-[72px] md:text-[96px] lg:text-[112px] leading-[0.92] tracking-tight text-[var(--text)] mb-4"
          style={{ fontFamily: 'var(--font-dm-serif)' }}
        >
          Most Discoveries Begin
          With a Detour.
        </h1>
        <p className="text-[var(--muted)] text-sm md:text-base mb-10 font-mono tracking-normal">
          <span className="italic text-[var(--muted)]">Follow yours.</span>
        </p>

        {/* Thin rule */}

        <div className="w-full border-t border-[var(--border)] mb-8" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a concept to explore"
              className="flex-1 bg-transparent text-[var(--text)] text-base placeholder-[var(--muted)] border-b border-[var(--border)] focus:border-[var(--text)] pb-2 focus:outline-none transition-colors duration-200 font-mono"
            />
            <button
              type="submit"
              disabled={isLoading || !topic.trim()}
              className="text-[11px] tracking-[0.12em] uppercase text-[var(--text)] border border-[var(--border)] px-5 py-2 hover:border-[var(--text)] hover:bg-[var(--bg-panel)] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-mono"
            >
              {isLoading ? 'Thinking…' : 'Explore →'}
            </button>
          </div>

          {errorMsg && (
            <p className="text-[12px] text-[#F59E0B] font-mono">{errorMsg}</p>
          )}
        </form>

        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 animate-fade-in">
          <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--muted)] font-mono">
            Try —
          </span>
          {SUGGESTIONS.map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => setTopic(s)}
                className="text-[11px] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer font-mono"
              >
                {s}
              </button>
              {i < SUGGESTIONS.length - 1 && (
                <span className="text-[var(--muted)] text-[10px] font-mono">/</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 z-50 bg-[var(--bg)]/95 flex flex-col items-center justify-center gap-3 animate-fade-in">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--text)] animate-ping" />
          <p className="text-[11px] tracking-[0.2em] uppercase text-[var(--muted)]">
            Building graph...
          </p>
        </div>
      )}
    </div>
  );
}
