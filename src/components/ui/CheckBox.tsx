import { Check } from 'lucide-react';

interface CheckBoxProps {
  checked: boolean;
  onToggle: () => void;
  size?: number;
}

export function CheckBox({ checked, onToggle, size = 18 }: CheckBoxProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center justify-center rounded transition-colors cursor-pointer border ${
        checked
          ? 'bg-slate-100 border-slate-600 text-slate-800'
          : 'bg-white border-slate-300 hover:border-slate-400'
      }`}
      style={{ width: size, height: size }}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && <Check size={size - 4} strokeWidth={3} />}
    </button>
  );
}
