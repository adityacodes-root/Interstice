'use client';

import React, { useState } from 'react';
import { useIntersticeStore } from '@/store/useIntersticeStore';

export default function ConnectionFinderPage() {
  const { 
    findConnection, 
    isLoading, 
    setActivePage,
    connectionBridgeResult,
    resetGraph
  } = useIntersticeStore();

  const [conceptA, setConceptA] = useState('');
  const [conceptB, setConceptB] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conceptA.trim() || !conceptB.trim()) return;

    setErrorMsg('');
    setLocalLoading(true);

    try {
      const success = await findConnection(conceptA.trim(), conceptB.trim());
      setLocalLoading(false);
      if (success) {
        setSelectedStepIndex(0);
      } else {
        setErrorMsg('Failed to establish a logical connection bridge. Please try other concepts.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to build connection. Please verify your connection and try again.');
      setLocalLoading(false);
    }
  };

  const handleResetSearch = () => {
    resetGraph();
    setConceptA('');
    setConceptB('');
  };


  if (connectionBridgeResult) {
    const { path, overallExplanation } = connectionBridgeResult;
    const activeStep = path[selectedStepIndex] || path[0];

    return (
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[var(--bg)] animate-fade-in">
        

        <aside className="w-full md:w-[350px] border-r border-[var(--border)] flex flex-col p-8 overflow-y-auto shrink-0 bg-[var(--bg-sidebar)]">
          
          <button 
            onClick={handleResetSearch}
            className="text-[11px] text-[var(--muted)] hover:text-[var(--text)] mb-8 tracking-[0.1em] uppercase text-left cursor-pointer transition-colors"
          >
            ← New Bridge Search
          </button>

          <h2 className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] mb-6 font-medium">
            Concept Bridge Path
          </h2>

          <div className="relative pl-6 flex flex-col gap-8">

            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--border)]" />

            {path.map((step, idx) => {
              const isSelected = idx === selectedStepIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedStepIndex(idx)}
                  className="relative text-left group flex flex-col gap-1.5 cursor-pointer focus:outline-none select-none"
                >

                  <div 
                    className={[
                      'absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border transition-all duration-150',
                      isSelected 
                        ? 'bg-[var(--text)] border-[var(--text)] scale-125 ring-4 ring-[var(--text)]/10' 
                        : 'bg-[var(--bg)] border-[var(--muted)] group-hover:border-[var(--text)]'
                    ].join(' ')}
                  />


                  <span className={[
                    'text-[13px] font-medium leading-none transition-colors duration-150',
                    isSelected ? 'text-[var(--text)]' : 'text-[var(--muted)] group-hover:text-[var(--text)]'
                  ].join(' ')}>
                    {step.name}
                  </span>


                  {step.reason && (
                    <span className="text-[11px] text-[var(--muted)] opacity-80 group-hover:opacity-100 group-hover:text-[var(--text)] transition-colors leading-relaxed font-light">
                      {step.reason}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setActivePage('explore')}
            className="mt-12 w-full text-center text-[12px] tracking-[0.12em] uppercase text-[var(--text)] border border-[var(--border)] py-3 hover:border-[var(--text)] hover:bg-[var(--bg-panel)] transition-all cursor-pointer font-medium"
          >
            Explore in Graph View
          </button>
        </aside>


        <main className="flex-1 overflow-y-auto p-10 md:p-16 flex flex-col gap-12 max-w-4xl">
          

          <section className="flex flex-col gap-4">
            <h1 className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] font-medium">
              Editorial Narrative
            </h1>
            <p 
              className="text-[20px] md:text-[24px] text-[var(--text)] leading-relaxed font-serif tracking-tight"
              style={{ fontFamily: 'var(--font-dm-serif)' }}
            >
              {overallExplanation}
            </p>
          </section>

          <div className="w-full border-t border-[var(--border)]" />


          {activeStep && (
            <section className="flex flex-col gap-8 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                

                {activeStep.image && (
                  <div className="w-full md:w-[220px] h-[160px] relative overflow-hidden bg-[var(--bg-panel)] border border-[var(--border)] shrink-0">
                    <img 
                      src={activeStep.image} 
                      alt={activeStep.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}


                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-medium tracking-tight text-[var(--text)]">
                      {activeStep.name}
                    </h2>
                    {activeStep.url && (
                      <a 
                        href={activeStep.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] text-[var(--muted)] hover:text-[var(--text)] underline"
                      >
                        Wikipedia Article ↗
                      </a>
                    )}
                  </div>
                  
                  <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                    {activeStep.explanation}
                  </p>
                </div>
              </div>


              {activeStep.categories && activeStep.categories.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] font-medium">
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activeStep.categories.slice(0, 6).map((cat: string) => (
                      <span 
                        key={cat} 
                        className="px-2.5 py-0.5 bg-[var(--bg-panel)] text-[var(--muted)] text-[11px] rounded border border-[var(--border)] select-none"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}


              {activeStep.sources && activeStep.sources.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] font-medium">
                    Sources & Citations
                  </h3>
                  <ul className="flex flex-col gap-1.5 pt-1">
                    {activeStep.sources.slice(0, 5).map((src: string, index: number) => {
                      let display = src;
                      try {
                        display = new URL(src).hostname;
                      } catch {}
                      return (
                        <li key={index} className="text-[12px] text-[var(--muted)] hover:text-[var(--text)] list-disc list-inside truncate">
                          <a href={src} target="_blank" rel="noreferrer" className="hover:underline">
                            {display} <span className="text-[var(--muted)] opacity-50 text-[10px] ml-1">{src}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    );
  }


  return (
    <div className="flex-1 flex flex-col justify-center px-12 md:px-20 max-w-4xl animate-fade-up bg-[var(--bg)]">


      <h1
        className="font-serif text-[56px] md:text-[72px] leading-[0.92] tracking-tight text-[var(--text)] mb-10"
        style={{ fontFamily: 'var(--font-dm-serif)' }}
      >
        CONNECTION<br />BRIDGE
      </h1>

      <div className="w-full border-t border-[var(--border)] mb-8" />

      <p className="text-[13px] text-[var(--muted)] leading-relaxed max-w-xl mb-10">
        Enter two unrelated concepts. The engine will discover the hidden intellectual
        bridge between them, mapping a logical chain of Wikipedia concepts explained by AI.
      </p>

      <form onSubmit={handleConnect} className="flex flex-col gap-8 max-w-xl">


        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)]">
            Origin Concept
          </label>
          <input
            type="text"
            value={conceptA}
            onChange={(e) => setConceptA(e.target.value)}
            placeholder="e.g. Kubernetes"
            disabled={localLoading}
            className="bg-transparent text-[var(--text)] text-base placeholder-[var(--muted)] border-b border-[var(--border)] focus:border-[var(--text)] pb-2 focus:outline-none transition-colors duration-200 disabled:opacity-50"
          />
        </div>


        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-[11px] text-[var(--muted)] tracking-widest">→</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>


        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)]">
            Destination Concept
          </label>
          <input
            type="text"
            value={conceptB}
            onChange={(e) => setConceptB(e.target.value)}
            placeholder="e.g. Japanese Language"
            disabled={localLoading}
            className="bg-transparent text-[var(--text)] text-base placeholder-[var(--muted)] border-b border-[var(--border)] focus:border-[var(--text)] pb-2 focus:outline-none transition-colors duration-200 disabled:opacity-50"
          />
        </div>


        {errorMsg && (
          <p className="text-[12px] text-[#F59E0B]">{errorMsg}</p>
        )}


        {localLoading && (
          <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
            <span className="tracking-[0.1em] uppercase">Mapping: {conceptA} → {conceptB}</span>
          </div>
        )}


        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={localLoading || !conceptA.trim() || !conceptB.trim()}
            className="text-[12px] tracking-[0.12em] uppercase text-[var(--text)] border border-[var(--border)] px-6 py-2.5 hover:border-[var(--text)] hover:bg-[var(--bg-panel)] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {localLoading ? 'Finding Bridge…' : 'Find Connection Bridge →'}
          </button>
        </div>
      </form>
    </div>
  );
}
