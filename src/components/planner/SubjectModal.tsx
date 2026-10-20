import React, { useState, useEffect } from 'react';
import { SubjectLegendItem, DEFAULT_PASTEL_PALETTE, HexColor } from '../../types';
import { ColorCircle } from '../ui/ColorCircle';
import { X, Trash2, Check, Plus } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

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
  const [name, setName] = useState('');
  const [color, setColor] = useState<HexColor>(DEFAULT_PASTEL_PALETTE[0]);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && subjectToEdit) {
        setName(subjectToEdit.name);
        setColor(subjectToEdit.color);
      } else {
        setName('');
        // Pick an unused or default color
        setColor(DEFAULT_PASTEL_PALETTE[0]);
      }
    }
  }, [isOpen, mode, subjectToEdit]);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {mode === 'edit' ? 'Edit Subject' : 'Add New Subject'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Preview */}
        <div className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Preview Badge
          </span>
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-slate-900 border border-black/10 shadow-xs"
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
              Subject Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mathematics, History, Physics..."
              maxLength={30}
              required
              className="w-full px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100"
            />
          </div>

          {/* Preset Pastel Palette */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Pastel Color Palette
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-2">
              {DEFAULT_PASTEL_PALETTE.map((palColor) => (
                <button
                  key={palColor}
                  type="button"
                  onClick={() => setColor(palColor)}
                  className={`h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                    color.toLowerCase() === palColor.toLowerCase()
                      ? 'border-slate-900 dark:border-white scale-105 ring-2 ring-slate-900/20 dark:ring-white/20'
                      : 'border-black/10 hover:scale-105'
                  }`}
                  style={{ backgroundColor: palColor }}
                  title={palColor}
                >
                  {color.toLowerCase() === palColor.toLowerCase() && (
                    <Check size={14} className="text-slate-900" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value as HexColor)}
                  className="w-7 h-7 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-all shadow-xs disabled:opacity-40 cursor-pointer"
              >
                {mode === 'edit' ? (
                  <>
                    <Check size={14} />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Add Subject
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
