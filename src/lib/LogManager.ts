/**
 * LogManager — client-side error capture for audit logs.
 *
 * Catches errors from edge function invocations and sends them
 * to a dedicated audit endpoint so they appear in CMS logs
 * even when the edge function never received the request
 * (network errors, CORS failures, etc.).
 */

import { supabase } from '@/config/supabase';

const LOG_ENDPOINT = 'admin-api';
const MAX_BATCH = 5;
const FLUSH_INTERVAL_MS = 2_000;

interface LogEntry {
  action: string;
  functionName: string;
  userId?: string;
  userEmail?: string;
  requestBody?: unknown;
  responseStatus: number;
  responseBody?: unknown;
  errorMessage?: string;
  timestamp: string;
}

class LogManager {
  private queue: LogEntry[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  enqueue(entry: LogEntry): void {
    this.queue.push(entry);
    if (this.queue.length >= MAX_BATCH) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), FLUSH_INTERVAL_MS);
    }
  }

  private async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, MAX_BATCH);
    try {
      const token = localStorage.getItem('_garda_admin_tkn');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await supabase.functions.invoke(LOG_ENDPOINT, {
        body: {
          action: 'batch_log',
          entries: batch.map((e) => ({
            ...e,
            requestBody: JSON.stringify(e.requestBody),
            responseBody: JSON.stringify(e.responseBody),
          })),
        },
        headers,
      });
    } catch (_) {
      // Swallow — logging must never break the app
    }
  }

  /** Force flush on page unload */
  destroy(): void {
    this.flush();
  }
}

export const logManager = new LogManager();

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => logManager.destroy());
}
