'use client';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

export function ToggleSwitch({ checked, onChange, disabled = false, size = 'default' }: ToggleSwitchProps) {
  const isSm = size === 'sm';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex items-center shrink-0 rounded-full transition-colors
        ${isSm ? 'w-7 h-4' : 'w-9 h-5'}
        ${checked ? 'bg-black' : 'bg-gray-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block bg-white rounded-full shadow-sm transition-transform
          ${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'}
          ${checked
            ? (isSm ? 'translate-x-[13px]' : 'translate-x-[19px]')
            : 'translate-x-[3px]'
          }
        `}
      />
    </button>
  );
}
