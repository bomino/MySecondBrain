"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  return (
    <SessionProvider basePath="/api/v1/auth">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else if (theme === "dark") {
      root.classList.remove("light");
    } else {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      root.classList.toggle("light", prefersLight);
    }
  }, [theme]);

  return <>{children}</>;
}
