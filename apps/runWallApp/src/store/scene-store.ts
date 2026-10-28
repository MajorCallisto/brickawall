import { create } from "zustand";

type SceneState = {
  /** Colour the environment lighting eases toward; set by the last brick. */
  accentColor: string;
  setAccentColor: (hex: string) => void;
  /** True while the fullscreen toggle has hidden every UI layer. */
  uiHidden: boolean;
  setUiHidden: (hidden: boolean) => void;
  /** True after the pointer has been still for a while. */
  pointerIdle: boolean;
  setPointerIdle: (idle: boolean) => void;
};

/** Scene-wide presentation state shared between the placer and the lighting. */
export const useSceneStore = create<SceneState>()((set) => ({
  accentColor: "green",
  setAccentColor: (hex) => set({ accentColor: hex }),
  uiHidden: false,
  setUiHidden: (uiHidden) => set({ uiHidden }),
  pointerIdle: false,
  setPointerIdle: (pointerIdle) => set({ pointerIdle }),
}));
