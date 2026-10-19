interface ColorCircleProps {
  color: string;
  size?: number;
  isSelected?: boolean;
  onPress?: () => void;
  className?: string;
}

export function ColorCircle({
  color,
  size = 18,
  isSelected = false,
  onPress,
  className = '',
}: ColorCircleProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`relative inline-flex items-center justify-center rounded-full transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-slate-800 ring-offset-1' : 'hover:scale-105'
      } ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        border: '1px solid rgba(0,0,0,0.12)',
      }}
    >
      {isSelected && (
        <span
          className="rounded-full bg-slate-900"
          style={{ width: Math.max(4, size / 3), height: Math.max(4, size / 3) }}
        />
      )}
    </button>
  );
}
