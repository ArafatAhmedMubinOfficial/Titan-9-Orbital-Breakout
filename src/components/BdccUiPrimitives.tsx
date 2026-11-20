import React from 'react';

interface LabeledProgressBarProps {
  label: string;
  value: number;
  max: number;
  valueText?: string;
  fillStyle?: 'blue' | 'crimson' | 'violet' | 'teal';
}

const FILL_COLORS: Record<NonNullable<LabeledProgressBarProps['fillStyle']>, string> = {
  // Exact BDCC LabeledProgressBar.tscn & PlayerPanel.tscn colors
  blue: '#2C588B',
  crimson: 'linear-gradient(90deg, #8B2C50 0%, #6E2363 100%)',
  violet: 'linear-gradient(90deg, #452C8B 0%, #7C229E 100%)',
  teal: '#286E65',
};

export const LabeledProgressBar: React.FC<LabeledProgressBarProps> = ({
  label,
  value,
  max,
  valueText,
  fillStyle = 'blue',
}) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const fill = FILL_COLORS[fillStyle];

  return (
    <div
      className="relative h-[24px] w-full overflow-hidden rounded-[2px] border border-black/35"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.28)' }}
    >
      <div
        className="absolute inset-y-0 left-0 transition-all duration-200"
        style={{
          width: `${pct}%`,
          background: fill,
        }}
      />
      <div className="relative z-10 h-full px-2 flex items-center justify-between text-[13px] font-semibold text-white bdcc-text-shadow select-none">
        <span className="truncate">{label}</span>
        <span className="font-mono-tabular text-[12px] shrink-0">
          {valueText ?? `${value} / ${max}`}
        </span>
      </div>
    </div>
  );
};

interface BetterButtonProps {
  label: string;
  hotkey?: string;
  tooltip?: string;
  subtext?: string;
  variant?: 'default' | 'accent' | 'danger' | 'good';
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

export const BetterButton: React.FC<BetterButtonProps> = ({
  label,
  hotkey,
  tooltip,
  subtext,
  variant = 'default',
  disabled = false,
  onClick,
  className = '',
}) => {
  const variantClass =
    variant === 'accent'
      ? 'bdcc-btn-accent'
      : variant === 'danger'
      ? 'bdcc-btn-danger'
      : variant === 'good'
      ? 'bdcc-btn-good'
      : 'bdcc-btn';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={tooltip ?? subtext ?? label}
      className={`relative min-h-[42px] px-3 py-1.5 flex flex-col items-center justify-center text-center cursor-pointer select-none ${variantClass} ${className}`}
    >
      {hotkey && (
        <span
          className="absolute top-0.5 left-1.5 text-[11px] font-mono-tabular pointer-events-none"
          style={{ color: 'rgba(255, 255, 255, 0.34)' }}
        >
          {hotkey}
        </span>
      )}
      <span className="text-[14px] font-semibold leading-tight text-white px-2">{label}</span>
      {subtext && (
        <span className="text-[11px] leading-tight text-white/65 truncate max-w-full px-1">
          {subtext}
        </span>
      )}
    </button>
  );
};
