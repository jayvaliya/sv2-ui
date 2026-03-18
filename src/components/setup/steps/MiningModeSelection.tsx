import { useEffect, useRef, useState } from 'react';
import type { MiningMode, StepProps } from '../types';
import { Miner3D, type MinerPhase } from './Miner3D';

export function MiningModeSelection({ updateData, onNext }: StepProps) {
  const [phase, setPhase] = useState<MinerPhase>('idle');
  const [selectedMode, setSelectedMode] = useState<MiningMode | null>(null);
  const nextRef = useRef(onNext);
  nextRef.current = onNext;

  useEffect(() => {
    if (phase !== 'arming') return;
    const timeout = setTimeout(() => setPhase('hashing'), 520);
    return () => clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'hashing') return;
    const timeout = setTimeout(() => setPhase('transitioning'), 980);
    return () => clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'transitioning') return;
    const timeout = setTimeout(() => nextRef.current(), 420);
    return () => clearTimeout(timeout);
  }, [phase]);

  const handleSelect = (miningMode: MiningMode) => {
    if (phase !== 'idle') return;
    setSelectedMode(miningMode);
    updateData({ miningMode, mode: miningMode === 'solo' ? 'no-jd' : null });
    setPhase('arming');
  };

  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const selectedLabel = selectedMode === 'pool' ? 'Pool' : 'Solo';
  const isBusy = phase !== 'idle';
  const isTransitioning = phase === 'transitioning';
  const statusText =
    phase === 'idle'
      ? 'Select a mode to spin up the miner.'
      : phase === 'arming'
        ? `${selectedLabel} mode selected. Fans are spinning up.`
        : phase === 'hashing'
          ? `${selectedLabel} mode active. Miner is hashing.`
          : 'Loading the next setup step.';

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-6 py-12 relative overflow-hidden"
      style={{
        transition: 'opacity 0.45s ease, transform 0.45s ease',
        opacity: isTransitioning ? 0 : 1,
        transform: isTransitioning ? 'scale(0.985)' : 'scale(1)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 26%, hsl(var(--primary) / 0.08), transparent 32%), radial-gradient(circle at 50% 52%, hsl(var(--primary) / 0.05), transparent 60%)',
        }}
        aria-hidden
      />

      <Miner3D phase={phase} />

      <div className="relative z-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <img
          src="/sv2-logo-240x40.png"
          srcSet="/sv2-logo-240x40.png 1x, /sv2-logo-480x80.png 2x"
          alt="Stratum V2"
          width="144"
          height="24"
          className="h-6 w-auto"
          style={isDark ? undefined : { filter: 'brightness(0.3)' }}
        />
      </div>

      <div
        className="relative z-10 w-full max-w-[580px] animate-fade-in-up"
        style={{ animationDelay: '0.08s' }}
      >
        <p className="text-center text-muted-foreground text-sm mb-2 tracking-wide">
          Choose how you'll mine bitcoin
        </p>
        <p className="text-center text-[12px] text-muted-foreground/80 mb-5" aria-live="polite">
          {statusText}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSelect('solo')}
            disabled={isBusy}
            aria-pressed={selectedMode === 'solo'}
            className={`group rounded-2xl border bg-card p-5 text-left transition-all duration-300 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              selectedMode === 'solo'
                ? 'border-primary/55 bg-primary/[0.05]'
                : 'border-border hover:border-primary/45 hover:bg-primary/[0.03]'
            }`}
            style={
              selectedMode === 'solo'
                ? {
                    boxShadow:
                      '0 0 30px hsl(var(--primary) / 0.12), inset 0 0 0 1px hsl(var(--primary) / 0.14)',
                  }
                : undefined
            }
          >
            <div className="text-foreground font-medium text-sm mb-1">Solo</div>
            <div className="text-muted-foreground text-xs leading-relaxed">
              Full block reward
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelect('pool')}
            disabled={isBusy}
            aria-pressed={selectedMode === 'pool'}
            className={`group rounded-2xl border bg-card p-5 text-left transition-all duration-300 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              selectedMode === 'pool'
                ? 'border-primary/55 bg-primary/[0.05]'
                : 'border-border hover:border-primary/45 hover:bg-primary/[0.03]'
            }`}
            style={
              selectedMode === 'pool'
                ? {
                    boxShadow:
                      '0 0 30px hsl(var(--primary) / 0.12), inset 0 0 0 1px hsl(var(--primary) / 0.14)',
                  }
                : undefined
            }
          >
            <div className="text-foreground font-medium text-sm mb-1">Pool</div>
            <div className="text-muted-foreground text-xs leading-relaxed">Regular payouts</div>
          </button>
        </div>
      </div>
    </div>
  );
}
