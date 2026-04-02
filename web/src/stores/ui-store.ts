import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  chatPanelOpen: boolean;
  theme: "light" | "dark" | "system";
  editorFontSize: number;
  editorLineHeight: number;
  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setEditorFontSize: (size: number) => void;
  setEditorLineHeight: (height: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      chatPanelOpen: false,
      theme: "dark",
      editorFontSize: 15,
      editorLineHeight: 1.7,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
      setTheme: (theme) => set({ theme }),
      setEditorFontSize: (size) => set({ editorFontSize: size }),
      setEditorLineHeight: (height) => set({ editorLineHeight: height }),
    }),
    {
      name: "second-brain-ui",
      partialize: (state) => ({
        theme: state.theme,
        editorFontSize: state.editorFontSize,
        editorLineHeight: state.editorLineHeight,
      }),
    }
  )
);
