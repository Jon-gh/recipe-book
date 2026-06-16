"use client";

import { SWRConfig } from "swr";
import { ToastProvider } from "@/components/Toast";

const swrConfig = {
  onError: (error: Error) => {
    if (error.message?.includes("401") || String(error).includes("401")) {
      window.location.href = "/auth/signin";
    }
  },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </SWRConfig>
  );
}
