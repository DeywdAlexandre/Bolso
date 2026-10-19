export type ToastKind = "success" | "info";
export type ToastMessage = { id: number; text: string; kind: ToastKind };

type Listener = (toasts: ToastMessage[]) => void;

let nextId = 1;
let toasts: ToastMessage[] = [];
const listeners = new Set<Listener>();
const DURATION_MS = 3200;

const emit = () => listeners.forEach((l) => l(toasts));

/** Mostra um aviso rápido na tela (some sozinho). */
export function showToast(text: string, kind: ToastKind = "success"): void {
  const toast = { id: nextId++, text, kind };
  toasts = [...toasts.slice(-2), toast];
  emit();
  setTimeout(() => dismissToast(toast.id), DURATION_MS);
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}
