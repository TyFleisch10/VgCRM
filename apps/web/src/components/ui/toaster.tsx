"use client";

// Minimal toast component — replace with full shadcn/ui Toaster after running:
// npx shadcn-ui@latest init && npx shadcn-ui@latest add toast

import { useState, createContext, useContext, useCallback } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const ToastContext = createContext<{
  toast: (msg: string, type?: Toast["type"]) => void;
}>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const colors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-gray-800",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${colors[t.type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs animate-in slide-in-from-right`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
