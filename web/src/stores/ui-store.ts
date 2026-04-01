import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  chatPanelOpen: boolean;
  theme: "light" | "dark" | "system";
  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  chatPanelOpen: false,
  theme: "system",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
  setTheme: (theme) => set({ theme }),
}));
