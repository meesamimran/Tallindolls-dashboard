"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Search, Music2, Loader2 } from "lucide-react";

export interface SongResult {
  songTitle: string;
  artistName: string;
  audioUrl: string;
  label: string; // "Artist - Song Title"
}

interface SongSearchProps {
  onSelect: (song: SongResult | null) => void;
  selectedSong: SongResult | null;
}

export default function SongSearch({ onSelect, selectedSong }: SongSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchDeezer = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/deezer-search?q=${encodeURIComponent(q.trim())}&limit=5`
      );
      const json = await res.json();
      if (json.results && Array.isArray(json.results)) {
        setResults(
          json.results.map((t: any) => ({
            songTitle: t.songTitle,
            artistName: t.artistName,
            audioUrl: t.audioUrl,
            label: `${t.artistName} - ${t.songTitle}`,
          }))
        );
      } else if (json.found) {
        setResults([
          {
            songTitle: json.songTitle,
            artistName: json.artistName,
            audioUrl: json.audioUrl,
            label: `${json.artistName} - ${json.songTitle}`,
          },
        ]);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    }
    setSearching(false);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchDeezer(value), 300);
  };

  const handleSelect = (song: SongResult) => {
    onSelect(song);
    setQuery(song.label);
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
    setResults([]);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const INPUT_STYLE: React.CSSProperties = {
    backgroundColor: "var(--neutral-secondary-medium)",
    border: "1px solid var(--border-default-medium)",
    color: "var(--heading)",
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[12px] font-medium text-[var(--body-subtle)] mb-1">
        🎵 Add Song (optional)
      </label>

      {selectedSong ? (
        /* Selected song chip */
        <div className="flex items-center gap-2 p-2.5 rounded-[2px] bg-[var(--success-soft)] border border-[var(--border-success-subtle)]">
          <Music2 className="size-4 text-[var(--success)] shrink-0" />
          <span className="text-[13px] font-medium text-[var(--fg-success)] flex-1 truncate">
            {selectedSong.label}
          </span>
          <button
            onClick={handleClear}
            className="text-[11px] text-[var(--body-subtle)] hover:text-[var(--danger)] transition-colors shrink-0"
          >
            Remove
          </button>
        </div>
      ) : (
        /* Search input */
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--body-subtle)]" />
            <input
              value={query}
              onChange={(e) => {
                handleInputChange(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search a song (e.g. Coldplay Yellow)"
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-[2px] focus:outline-none"
              style={INPUT_STYLE}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--brand)] animate-spin" />
            )}
          </div>

          {/* Dropdown suggestions */}
          {open && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-xl max-h-[200px] overflow-y-auto">
              {results.map((song, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(song)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-[var(--brand-softer)] transition-colors",
                    i > 0 && "border-t border-[var(--border-default)]"
                  )}
                >
                  <Music2 className="size-3.5 text-[var(--brand)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--heading)] truncate">
                      {song.songTitle}
                    </p>
                    <p className="text-[11px] text-[var(--body-subtle)] truncate">
                      {song.artistName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
