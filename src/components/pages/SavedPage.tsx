'use client';

import React, { useState } from 'react';
import { useIntersticeStore, HistoryItem } from '@/store/useIntersticeStore';

export default function SavedPage() {
  const { history, loadExploration, toggleFavorite, deleteHistoryItem, clearHistory } = useIntersticeStore();

  const [filterQuery, setFilterQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const filtered = history.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(filterQuery.toLowerCase());
    const matchFav = onlyFavorites ? item.favorite : true;
    return matchSearch && matchFav;
  });

  const totalSessions   = history.length;
  const favCount        = history.filter((h) => h.favorite).length;
  const maxDepth        = history.length > 0 ? Math.max(...history.map((h) => h.depth)) : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-10 flex flex-col gap-8">


        <div className="flex items-end justify-between">
          <div>
            <h1
              className="text-[40px] leading-tight tracking-tight text-white mb-2"
              style={{ fontFamily: 'var(--font-dm-serif)' }}
            >
              Saved Journeys
            </h1>
            <p className="text-[13px] text-[#A1A1AA]">
              Revisit and restore previous explorations.
            </p>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all saved journeys?')) {
                  clearHistory();
                }
              }}
              className="text-[11px] tracking-[0.12em] uppercase text-[#EF4444] hover:text-red-400 transition-colors cursor-pointer pb-1.5"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="border-t border-[#27272A]" />


        <div className="flex items-center gap-10">
          {[
            { label: 'Total',    value: totalSessions },
            { label: 'Starred',  value: favCount      },
            { label: 'Max depth', value: maxDepth     },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <span className="text-[24px] font-light text-white tabular-nums">{s.value}</span>
              <span className="text-[10px] tracking-[0.15em] uppercase text-[#A1A1AA]">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-[#27272A]" />


        <div className="flex items-center gap-4">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter explorations…"
            className="flex-1 bg-transparent text-[13px] text-white placeholder-[#3F3F46] border-b border-[#27272A] focus:border-white pb-1.5 focus:outline-none transition-colors"
          />
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={[
              'text-[11px] tracking-[0.1em] uppercase transition-colors cursor-pointer',
              onlyFavorites ? 'text-white' : 'text-[#A1A1AA] hover:text-white',
            ].join(' ')}
          >
            {onlyFavorites ? '★ Starred' : '☆ Starred'}
          </button>
        </div>


        {filtered.length > 0 ? (
          <div className="flex flex-col">
            {filtered.map((item, i) => (
              <div
                key={item.id}
                className={[
                  'flex items-center justify-between py-4 gap-4',
                  i < filtered.length - 1 ? 'border-b border-[#1C1C1C]' : '',
                ].join(' ')}
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[13px] text-white truncate font-medium">
                    {item.title}
                  </span>
                  <div className="flex items-center gap-3 text-[11px] text-[#A1A1AA]">
                    <span>{item.date}</span>
                    <span className="text-[#3F3F46]">·</span>
                    <span>{item.nodeCount} concepts</span>
                    <span className="text-[#3F3F46]">·</span>
                    <span className="capitalize">{item.mode}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    className={[
                      'text-[14px] cursor-pointer transition-colors',
                      item.favorite ? 'text-white' : 'text-[#3F3F46] hover:text-white',
                    ].join(' ')}
                    title="Toggle star"
                  >
                    {item.favorite ? '★' : '☆'}
                  </button>
                  <button
                    onClick={() => loadExploration(item)}
                    className="text-[11px] tracking-[0.1em] uppercase text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => deleteHistoryItem(item.id)}
                    className="text-[11px] text-[#3F3F46] hover:text-white transition-colors cursor-pointer"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-8">
            <p className="text-[13px] text-[#A1A1AA]">
              {onlyFavorites
                ? 'No starred explorations yet.'
                : 'No explorations saved yet. Start one from New Exploration.'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
