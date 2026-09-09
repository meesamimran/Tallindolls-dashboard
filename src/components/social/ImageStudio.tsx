"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  FORMAT_PRESETS,
  type FormatPreset,
  type ImageInfo,
} from "@/lib/imageFormats";
import {
  Upload,
  Download,
  ImageIcon,
  Crop,
  Trash2,
  X,
  PenLine,
  Film,
  Maximize2,
  Check,
} from "lucide-react";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

export interface MediaFileEntry {
  id: string;
  file: File;
  dataUrl: string;
  isVideo: boolean;
  /** Blob URL for video playback in preview */
  videoBlobUrl?: string;
  /** Custom user-selected thumbnail (overrides auto-extracted frame) */
  selectedThumbnail?: string;
  width?: number;
  height?: number;
  duration?: number;
  crops: Record<string, string>;
}

interface ImageStudioProps {
  /** Current media files */
  files: MediaFileEntry[];
  /** Active format key for crop operations */
  activeFormatKey: string;
  /** Focal point X [0-1] */
  focusX: number;
  /** Focal point Y [0-1] */
  focusY: number;
  /** Status message shown during processing */
  statusMessage?: string;
  /** Called when files are uploaded (single or multi) */
  onUploadFiles: (files: File[]) => void;
  /** Called when a file is removed */
  onRemoveFile: (id: string) => void;
  /** Called when edit is clicked for a file */
  onEditFile: (id: string) => void;
  /** Called when format tab is selected */
  onSelectFormat: (key: string) => void;
  /** Called when focal point changes */
  onFocusChange: (x: number, y: number) => void;
  /** Called to download a specific format */
  onDownload: (preset: FormatPreset) => void;
  /** Called to download all formats */
  onDownloadAll: () => void;
  /** Called to reset/clear all media */
  onReset: () => void;
  /** Editing state for the currently edited file */
  editingFileId: string | null;
  /** Preview of the edit */
  editPreview: string | null;
  /** Edit fit mode */
  editFit: "contain" | "cover";
  /** Called when edit fit changes */
  onEditFitChange: (fit: "contain" | "cover") => void;
}

export default function ImageStudio({
  files,
  activeFormatKey,
  focusX,
  focusY,
  statusMessage,
  onUploadFiles,
  onRemoveFile,
  onEditFile,
  onSelectFormat,
  onFocusChange,
  onDownload,
  onDownloadAll,
  onReset,
  editingFileId,
  editPreview,
  editFit,
  onEditFitChange,
}: ImageStudioProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const activePreset =
    FORMAT_PRESETS.find((p) => p.key === activeFormatKey) ?? FORMAT_PRESETS[0];

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const arr = Array.from(fileList);
    const valid = arr.filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (valid.length > 0) onUploadFiles(valid);
  };

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fmtDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const hasFiles = files.length > 0;

  // ── Empty state: dropzone ──
  if (!hasFiles) {
    return (
      <div className="bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)] p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="size-8 rounded-[2px] flex items-center justify-center text-white"
              style={GRADIENT_BRAND}
            >
              <ImageIcon className="size-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--heading)]">
                Media Studio
              </h2>
              <p className="text-[12px] text-[var(--body-subtle)] mt-0.5">
                Auto-formatted for every social placement
              </p>
            </div>
          </div>
          {/* Format badges */}
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-end">
            {["JPG", "PNG", "WebP", "MP4", "MOV"].map((fmt) => (
              <span
                key={fmt}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)] border border-[var(--border-default)] uppercase tracking-wide"
              >
                {fmt}
              </span>
            ))}
            <span className="text-[10px] text-[var(--body-subtle)] font-medium ml-1">
              up to 100 MB
            </span>
          </div>
        </div>

        {/* Dropzone */}
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="flex flex-col items-center justify-center gap-4 py-12 px-6 rounded-[2px] border-2 border-dashed border-[var(--border-default-medium)] cursor-pointer hover:border-[var(--brand)] hover:bg-[var(--brand-softer)] transition-all text-center group"
        >
          <div
            className="size-14 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-105"
            style={GRADIENT_BRAND}
          >
            <Upload className="size-6 text-white" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[15px] font-semibold text-[var(--heading)]">
              Drop media here or click to browse
            </p>
            <p className="text-[13px] text-[var(--body-subtle)]">
              Single image · Multi-image carousel · Video reel
            </p>
          </div>
          {/* Aspect ratio hints */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {[
              { ratio: "1:1", label: "Feed", color: "text-[#E1306C]" },
              { ratio: "4:5", label: "Portrait", color: "text-[#833AB4]" },
              { ratio: "9:16", label: "Story / Reel", color: "text-[#1877F2]" },
            ].map((r) => (
              <div
                key={r.ratio}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)]"
              >
                <span className={`text-[11px] font-bold ${r.color}`}>{r.ratio}</span>
                <span className="text-[10px] text-[var(--body-subtle)]">{r.label}</span>
              </div>
            ))}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>
    );
  }

  // ── Files loaded: compact thumbnail strip ──
  return (
    <div className="bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-3">
          <div
            className="size-8 rounded-[2px] flex items-center justify-center text-white"
            style={GRADIENT_BRAND}
          >
            <ImageIcon className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-[var(--heading)]">
                Media Studio
              </h2>
              {files.length > 1 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[var(--brand-softer)] text-[var(--brand)] border border-[var(--brand)]/20 uppercase tracking-wider">
                  Carousel
                </span>
              )}
            </div>
            <p className="text-[12px] text-[var(--body-subtle)] mt-0.5">
              {files.length} file{files.length !== 1 ? "s" : ""} ·{" "}
              {files.some((f) => f.isVideo) ? "🎬 Video detected" : "📷 Images"}
              {files.length > 1 ? ` · ${files.length} slides` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white rounded-[2px] transition-opacity hover:opacity-90 shadow-xs"
            style={GRADIENT_BRAND}
          >
            <Upload className="size-3.5" /> Add more
          </button>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[var(--body-subtle)] rounded-[2px] hover:text-[var(--danger)] hover:bg-[var(--neutral-secondary-medium)] transition-colors border border-[var(--border-default)]"
          >
            <Trash2 className="size-3.5" /> Clear all
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              if (e.target) e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Status */}
      {statusMessage && (
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[2px] text-[12px] font-medium animate-pulse border border-[var(--brand)]/20"
          style={{
            backgroundColor: "var(--brand-softer)",
            color: "var(--brand)",
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* ── Thumbnail Strip ── */}
      <div className="flex flex-wrap gap-3">
        {files.map((f, fileIdx) => {
          const isEditing = editingFileId === f.id;
          // Determine aspect ratio tag based on crops available
          const hasStory = !!f.crops?.["story"];
          const ratioTag = f.isVideo ? "9:16" : hasStory ? "9:16" : "1:1";
          return (
            <div
              key={f.id}
              className={cn(
                "shrink-0 rounded-[2px] border-2 transition-all overflow-hidden group",
                isEditing
                  ? "border-[var(--brand)] ring-2 ring-[var(--brand)]/20 bg-[var(--brand-softer)]"
                  : "border-[var(--border-default)] bg-[var(--neutral-secondary-medium)] hover:border-[var(--brand)]/40"
              )}
              style={{ width: 156 }}
            >
              {/* Thumbnail image */}
              <div
                className="relative w-full overflow-hidden bg-[var(--neutral-tertiary)] flex items-center justify-center"
                style={{ aspectRatio: "1/1" }}
              >
                {f.dataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.dataUrl}
                    alt={f.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-8 text-[var(--body-subtle)]" />
                )}

                {/* Video badge */}
                {f.isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <div className="size-10 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                      <svg
                        className="size-4 text-white ml-0.5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Slide index badge */}
                {files.length > 1 && (
                  <div className="absolute top-1.5 left-1.5 size-5 rounded-full bg-black/60 text-white text-[10px] font-bold flex items-center justify-center">
                    {fileIdx + 1}
                  </div>
                )}

                {/* Aspect ratio badge */}
                <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-[2px] bg-black/60 text-white text-[9px] font-bold tracking-wide backdrop-blur-sm">
                  {ratioTag}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => onEditFile(f.id)}
                    className="size-8 rounded-full bg-white/95 flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                    title="Edit crop & focal point"
                  >
                    <PenLine className="size-3.5 text-[#262626]" />
                  </button>
                  <button
                    onClick={() => onRemoveFile(f.id)}
                    className="size-8 rounded-full bg-white/95 flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                    title="Remove"
                  >
                    <X className="size-3.5 text-[#ed4956]" />
                  </button>
                </div>
              </div>

              {/* File info */}
              <div className="p-2 space-y-1">
                <p
                  className="text-[11px] font-semibold text-[var(--heading)] truncate"
                  title={f.file.name}
                >
                  {f.file.name}
                </p>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--body-subtle)]">
                    {f.width && f.height ? (
                      <span>{f.width}×{f.height}</span>
                    ) : (
                      <span>{fmtSize(f.file.size)}</span>
                    )}
                    {f.isVideo && f.duration && (
                      <span className="flex items-center gap-0.5">
                        <Film className="size-2.5" />
                        {fmtDuration(f.duration)}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-[var(--body-subtle)] uppercase">
                    {fmtSize(f.file.size)}
                  </span>
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-1 pt-1 border-t border-[var(--border-default)]">
                  <button
                    onClick={() => onEditFile(f.id)}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-[2px] transition-colors",
                      isEditing
                        ? "text-white"
                        : "text-[var(--body)] hover:bg-[var(--neutral-tertiary)]"
                    )}
                    style={isEditing ? GRADIENT_BRAND : undefined}
                  >
                    <Crop className="size-2.5" /> Crop
                  </button>
                  <button
                    onClick={() => onRemoveFile(f.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-semibold text-[var(--body)] rounded-[2px] hover:text-[var(--danger)] hover:bg-[var(--neutral-tertiary)] transition-colors"
                  >
                    <Trash2 className="size-2.5" /> Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Format tabs (when editing or always visible) ── */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-default)]">
        <span className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider shrink-0">
          Format
        </span>
        {(files.some((f) => f.isVideo)
          ? FORMAT_PRESETS.filter((p) => p.key === "story")
          : FORMAT_PRESETS
        ).map((p) => {
          const active = p.key === activeFormatKey;
          return (
            <button
              key={p.key}
              onClick={() => onSelectFormat(p.key)}
              className={cn(
                "text-left px-2.5 py-1.5 rounded-[2px] border transition-colors",
                active
                  ? "text-white border-transparent"
                  : "text-[var(--body)] border-[var(--border-default)] hover:bg-[var(--neutral-secondary-medium)]"
              )}
              style={active ? GRADIENT_BRAND : undefined}
            >
              <span className="text-[12px] font-semibold">{p.label}</span>
              <span className="text-[11px] opacity-70 ml-1">
                {p.ratioLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Focal point sliders ── */}
      <div className="grid grid-cols-2 gap-3">
        <FocalSlider
          label="Horizontal"
          value={focusX}
          onChange={(v) => onFocusChange(v, focusY)}
        />
        <FocalSlider
          label="Vertical"
          value={focusY}
          onChange={(v) => onFocusChange(focusX, v)}
        />
      </div>

      {/* ── Export info + download ── */}
      <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-[var(--border-default)]">
        <div className="flex items-center gap-2 text-[12px] text-[var(--body-subtle)]">
          <Maximize2 className="size-3.5" />
          <span>
            {activePreset.width}×{activePreset.height}px · {activePreset.usage}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => onDownload(activePreset)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white rounded-[2px] transition-opacity hover:opacity-90"
            style={GRADIENT_BRAND}
          >
            <Download className="size-3.5" /> Download {activePreset.ratioLabel}
          </button>
          <button
            onClick={onDownloadAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[var(--body)] rounded-[2px] border border-[var(--border-default)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
          >
            <Download className="size-3.5" /> All sizes
          </button>
        </div>
      </div>

      {/* ── Inline Edit Mode ── */}
      {editingFileId && (
        <div className="p-4 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--heading)]">
              Edit Crop &amp; Fit
            </h3>
            <button
              onClick={() => onEditFile(editingFileId)}
              className="p-1 text-[var(--body-subtle)] hover:text-[var(--heading)]"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original */}
            <div>
              <p className="text-[11px] font-semibold text-[var(--body-subtle)] mb-1 uppercase tracking-wider">
                Original
              </p>
              <div
                className="rounded-[2px] overflow-hidden bg-[var(--neutral-tertiary)]"
                style={{ aspectRatio: "1/1" }}
              >
                {files
                  .find((f) => f.id === editingFileId)
                  ?.dataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={files.find((f) => f.id === editingFileId)!.dataUrl}
                    className="w-full h-full object-contain"
                    alt="Original"
                  />
                )}
              </div>
            </div>
            {/* Edited preview */}
            <div>
              <p className="text-[11px] font-semibold text-[var(--body-subtle)] mb-1 uppercase tracking-wider">
                Preview
              </p>
              <div
                className="rounded-[2px] overflow-hidden bg-[var(--neutral-tertiary)]"
                style={{ aspectRatio: "1/1" }}
              >
                {editPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editPreview}
                    className="w-full h-full object-contain"
                    alt="Preview"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--body-subtle)] text-[12px]">
                    Adjust fit to preview
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fit mode selector */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--body-subtle)] w-16">
              Fit mode
            </span>
            {(["contain", "cover"] as const).map((f) => (
              <button
                key={f}
                onClick={() => onEditFitChange(f)}
                className={cn(
                  "px-3 py-1.5 text-[12px] font-medium rounded-[2px] border capitalize transition-colors",
                  editFit === f
                    ? "text-white border-transparent"
                    : "text-[var(--body)] border-[var(--border-default)]"
                )}
                style={editFit === f ? GRADIENT_BRAND : undefined}
              >
                {f === "contain" ? "Fit (full image)" : "Fill (crop edges)"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FocalSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-[var(--body-subtle)] mb-1">
        {label} align
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--brand)] cursor-pointer"
      />
    </label>
  );
}
