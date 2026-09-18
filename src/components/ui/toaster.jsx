import React from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider role="status" aria-live="polite">
      {toasts
        .filter((t) => t.open !== false)
        .map(function ({ id, title, description, action, open: _open, duration: _duration, ...props }) {
          return (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose onClick={() => dismiss(id)} aria-label="Dismiss notification" />
            </Toast>
          );
        })}
      <ToastViewport />
    </ToastProvider>
  );
} 