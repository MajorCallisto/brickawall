"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useConfirmStore } from "@/store/confirm-store";
import { Icon } from "./icons";

/** Modal confirmation for destructive actions. Mount once, outside the canvas. */
export function ConfirmDialog() {
  const request = useConfirmStore((s) => s.request);
  const settle = useConfirmStore((s) => s.settle);

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle(false);
      if (e.key === "Enter") settle(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request, settle]);

  if (!request) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="absolute inset-0 z-30 flex items-center justify-center bg-foreground/20 font-serif backdrop-blur-[2px]"
      onClick={() => settle(false)}
    >
      <div
        className="w-80 rounded-lg border border-foreground/20 bg-white/90 p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-red-700">
            <Icon icon={AlertTriangle} size={20} />
          </span>
          <div className="flex-1">
            <h2 id="confirm-title" className="text-[16px] font-bold">
              {request.title}
            </h2>
            {request.message && (
              <p className="mt-1 text-[14px] text-foreground/70">
                {request.message}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => settle(false)}
            className="rounded px-3 py-1.5 text-[13px] tracking-[2px] uppercase hover:bg-foreground/10"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => settle(true)}
            className="rounded bg-red-700 px-3 py-1.5 text-[13px] tracking-[2px] text-white uppercase hover:bg-red-800"
          >
            {request.confirmLabel ?? "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
