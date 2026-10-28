import { create } from "zustand";

export type ConfirmRequest = {
  title: string;
  message?: string;
  /** Label of the confirming button, e.g. "Delete". */
  confirmLabel?: string;
};

type ConfirmState = {
  request: (ConfirmRequest & { resolve: (ok: boolean) => void }) | null;
  /** Ask the user; resolves true when they confirm. Only one at a time. */
  confirm: (request: ConfirmRequest) => Promise<boolean>;
  settle: (ok: boolean) => void;
};

/** Shared confirmation prompt. Every destructive action goes through it. */
export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  request: null,
  confirm: (request) =>
    new Promise<boolean>((resolve) => {
      get().request?.resolve(false);
      set({ request: { ...request, resolve } });
    }),
  settle: (ok) => {
    get().request?.resolve(ok);
    set({ request: null });
  },
}));

/** Convenience for callers outside React components. */
export const confirm = (request: ConfirmRequest) =>
  useConfirmStore.getState().confirm(request);
