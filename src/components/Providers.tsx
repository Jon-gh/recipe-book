"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";

const swrConfig = {
  onError: (error: Error) => {
    if (error.message?.includes("401") || String(error).includes("401")) {
      window.location.href = "/auth/signin";
    }
  },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={swrConfig}>{children}</SWRConfig>
    </SessionProvider>
  );
}
