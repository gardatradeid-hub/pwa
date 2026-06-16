import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-garda-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-garda-cyan animate-spin" />
        <p className="text-sm text-garda-text-muted font-mono-num">Garda</p>
      </div>
    </div>
  );
}
