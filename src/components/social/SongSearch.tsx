"use client";

import { useState } from "react";
import { Music2 } from "lucide-react";

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

const UNAVAILABLE_MSG =
  "This feature is temporarily unavailable due to low resources.";

export default function SongSearch(_props: SongSearchProps) {
  const [showMsg, setShowMsg] = useState(false);

  return (
    <div className="relative">
      <label className="block text-[12px] font-medium text-[var(--body-subtle)] mb-1">
        🎵 Add Song (optional)
      </label>

      <button
        type="button"
        title={UNAVAILABLE_MSG}
        onClick={() => setShowMsg((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-[2px] border border-[var(--border-default-medium)] bg-[var(--neutral-secondary-medium)] opacity-60 cursor-not-allowed text-left"
      >
        <Music2 className="size-3.5 text-[var(--body-subtle)] shrink-0" />
        <span className="text-[13px] text-[var(--body-subtle)]">
          Music temporarily unavailable
        </span>
      </button>

      {showMsg && (
        <p className="mt-1.5 text-[12px] text-[var(--body-subtle)]">
          {UNAVAILABLE_MSG}
        </p>
      )}
    </div>
  );
}
