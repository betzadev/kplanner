import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SubjectLegendItem, DEFAULT_PASTEL_PALETTE, HexColor, UNLOCKABLE_THEMES } from '../../types';
import { ColorCircle } from '../ui/ColorCircle';
import { useGamificationStore } from '../../store/useGamificationStore';
import { X, Trash2, Check } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { useLanguageStore } from '../../store/useLanguageStore';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectToEdit?: SubjectLegendItem | null;
  onSave: (name: string, color: HexColor, id?: string) => void;
  onDelete?: (id: string) => void;
  mode: 'add' | 'edit';
}

export function SubjectModal({
  isOpen,
  onClose,
  subjectToEdit,
  onSave,
  onDelete,
  mode,
}: SubjectModalProps) {
  const t = useLanguageStore((state) => state.t);
  const [name, setName] = useState('');
  const [color, setColor] = useState<HexColor>(DEFAULT_PASTEL_PALETTE[0]!);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('dreamy_pastel');

  const unlockedThemes = useGamificationStore((state) => state.unlockedThemes) ?? [];

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && subjectToEdit) {
        setName(subjectToEdit.name);
        setColor(subjectToEdit.color);
      } else {
        setName('');
        setColor(DEFAULT_PASTEL_PALETTE[0]!);
      }
    }
  }, [isOpen, mode, subjectToEdit]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const currentTheme = UNLOCKABLE_THEMES.find((item) => item.id === selectedThemeId) || UNLOCKABLE_THEMES[0]!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), color, subjectToEdit?.id);
    triggerHaptic('success');
    onClose();
  };

  const handleDelete = () => {
    if (!subjectToEdit || !onDelete) return;
    if (window.confirm(`Are you sure you want to delete "${subjectToEdit.name}"?`)) {
      onDelete(subjectToEdit.id);
      triggerHaptic('warning');
      onClose();
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full shadow-2xs"
              style={{ backgroundColor: color }}
            />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {mode === 'edit' ? t.editSubject : t.addSubject}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Preview */}
        <div className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Preview
          </span>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-slate-900 border border-black/10 shadow-2xs"
            style={{ backgroundColor: color }}
          >
            <ColorCircle color={color} size={12} />
            <span className="truncate max-w-[140px]">{name.trim() || 'Subject Name'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject Name Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mathematics, History, Physics..."
              maxLength={30}
              required
              className="w-full px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
          </div>

          {/* Theme Palette Switcher */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Palette
              </label>
              <select
                value={selectedThemeId}
                onChange={(e) => setSelectedThemeId(e.target.value)}
                className="text-[11px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-slate-700 dark:text-slate-200 cursor-pointer min-h-[36px]"
              >
                {UNLOCKABLE_THEMES.filter(
                  (theme) => theme.priceGems === 0 || unlockedThemes.includes(theme.id)
                ).map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name} {theme.priceGems === 0 ? '(Free)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Colors Grid with 44px min touch targets */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-2">
              {currentTheme.colors.map((palColor) => (
                <button
                  key={palColor}
                  type="button"
                  onClick={() => setColor(palColor)}
                  className={`min-h-[40px] rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    color.toLowerCase() === palColor.toLowerCase()
                      ? 'border-slate-900 dark:border-white scale-105 ring-2 ring-slate-900/20 dark:ring-white/20'
                      : 'border-black/10 hover:scale-105'
                  }`}
                  style={{ backgroundColor: palColor }}
                  title={palColor}
                  aria-label={`Color ${palColor}`}
                >
                  {color.toLowerCase() === palColor.toLowerCase() && (
                    <Check size={16} className="text-slate-900" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center gap-2 pt-1">
              <label className="min-h-[44px] flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value as HexColor)}
                  className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  Custom hex: {color}
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            {mode === 'edit' && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
                <span>{t.deleteTask}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {mode === 'edit' ? t.saveChanges : t.addSubject}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
