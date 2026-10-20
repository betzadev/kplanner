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
      className={`inline-flex items-center justify-center rounded-md transition-all cursor-pointer border ${
        checked
          ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-2xs'
          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
      }`}
      style={{ width: size, height: size }}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && <Check size={size - 4} strokeWidth={3} />}
    </button>
  );
}
