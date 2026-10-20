import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DateString, DailySheet, GridCellKey } from '../../types';
import { useSubjectStore } from '../../store/useSubjectStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { formatStudyDuration, parseDateString } from '../../utils/timeSlotMapper';
import { triggerHaptic } from '../../utils/haptics';
import { X, Download, Share2, Sparkles } from 'lucide-react';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: DateString;
  sheet: DailySheet;
}

export function ShareCardModal({ isOpen, onClose, date, sheet }: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const subjects = useSubjectStore((state) => state.subjects);
  const { calculateStreak } = useGamificationStore();
  const { streakCount } = calculateStreak();

  const [cardUrl, setCardUrl] = useState<string | null>(null);

  const parsedDate = parseDateString(date);
  const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][parsedDate.getDay()];
  const formattedDate = `${parsedDate.getFullYear()}.${String(parsedDate.getMonth() + 1).padStart(2, '0')}.${String(parsedDate.getDate()).padStart(2, '0')} (${dayOfWeek})`;

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Standard 9:16 Vertical Story format
    const width = 540;
    const height = 960;
    canvas.width = width;
    canvas.height = height;

    // Background Gradient: Dreamy pastel tones
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#E4EDFC');
    bgGrad.addColorStop(0.5, '#F0F5FD');
    bgGrad.addColorStop(1, '#E2ECE9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative Card Container
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.roundRect(30, 40, width - 60, height - 80, 28);
    ctx.fill();
    ctx.strokeStyle = '#C2D8FC';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top Header
    ctx.fillStyle = '#1e3a8a';
    ctx.font = '900 16px Inter, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('K-PLANNER • STUDYGRAM', 60, 85);

    // Date
    ctx.fillStyle = '#64748b';
    ctx.font = '700 13px Inter, monospace';
    ctx.fillText(formattedDate, 60, 110);

    // Streak Pill
    ctx.fillStyle = '#FFF1C5';
    ctx.beginPath();
    ctx.roundRect(width - 170, 70, 110, 32, 16);
    ctx.fill();
    ctx.strokeStyle = '#FDE2E4';
    ctx.stroke();

    ctx.fillStyle = '#b45309';
    ctx.font = '900 13px Inter, monospace';
    ctx.fillText(`🔥 ${streakCount} DAYS`, width - 158, 91);

    // Total Study Time Banner
    ctx.fillStyle = '#F0F5FD';
    ctx.beginPath();
    ctx.roundRect(50, 140, width - 100, 85, 20);
    ctx.fill();
    ctx.strokeStyle = '#9FC6FC';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText('TOTAL FOCUSED TIME', 70, 170);

    const totalDuration = formatStudyDuration(sheet.totalMinutesStudied ?? 0, 'standard');
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 32px Inter, monospace';
    ctx.fillText(totalDuration, 70, 208);

    if (sheet.completionStamp) {
      ctx.save();
      ctx.translate(width - 150, 182);
      ctx.rotate(-0.08);
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(-50, -15, 100, 30);
      ctx.setLineDash([]);
      ctx.fillStyle = '#be123c';
      ctx.font = '800 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sheet.completionStamp.toUpperCase(), 0, 4);
      ctx.restore();
    }

    // Main Daily Goal
    ctx.fillStyle = '#334155';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.fillText('MAIN FOCUS & GOAL', 55, 255);

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(50, 265, width - 100, 48, 14);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    ctx.fillStyle = sheet.mainGoal ? '#1e293b' : '#94a3b8';
    ctx.font = '500 13px Inter, sans-serif';
    const goalText = sheet.mainGoal || 'No specific daily goal set';
    ctx.fillText(goalText.length > 40 ? goalText.slice(0, 37) + '...' : goalText, 65, 295);

    // 10-Minute Grid Mini Snapshot (24 hours x 6 blocks)
    ctx.fillStyle = '#334155';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.fillText('10-MIN STUDY MATRIX (24H)', 55, 345);

    const subjectMap = new Map(subjects.map((s) => [s.id, s.color]));
    const gridX = 50;
    const gridY = 355;
    const gridW = width - 100;
    const rowH = 14;
    const colW = (gridW - 35) / 6;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(gridX, gridY, gridW, 24 * rowH + 20, 14);
    ctx.fill();
    ctx.strokeStyle = '#C2D8FC';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw grid rows
    for (let h = 0; h < 24; h++) {
      const y = gridY + 10 + h * rowH;

      // Hour label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 9px monospace';
      ctx.fillText(String(h).padStart(2, '0'), gridX + 8, y + 10);

      // 6 blocks
      for (let t = 0; t < 6; t++) {
        const key = `${h}-${t}`;
        const cell = sheet.timeGrid?.[key as GridCellKey];
        const x = gridX + 30 + t * colW;

        ctx.strokeStyle = '#f1f5f9';
        ctx.strokeRect(x, y, colW, rowH);

        if (cell && cell.subjectId) {
          const color = subjectMap.get(cell.subjectId) || '#9FC6FC';
          ctx.fillStyle = color;
          ctx.fillRect(x + 1, y + 1, colW - 2, rowH - 2);
        }
      }
    }

    // Subject Breakdown legend at bottom
    const legendY = gridY + 24 * rowH + 45;
    ctx.fillStyle = '#334155';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.fillText('SUBJECT SUMMARY', 55, legendY);

    const activeSubjects = subjects.filter((s) => {
      return Object.values(sheet.timeGrid || {}).some((c) => c.subjectId === s.id);
    });

    if (activeSubjects.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 12px Inter, sans-serif';
      ctx.fillText('No logged sessions yet today.', 60, legendY + 25);
    } else {
      activeSubjects.slice(0, 4).forEach((sub, idx) => {
        const itemY = legendY + 20 + idx * 24;
        ctx.fillStyle = sub.color;
        ctx.beginPath();
        ctx.arc(65, itemY + 4, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.font = '600 12px Inter, sans-serif';
        ctx.fillText(sub.name, 80, itemY + 8);
      });
    }

    // Watermark
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Planned with K-Planner • Dreamy Study', width / 2, height - 55);
    ctx.textAlign = 'left';

    setCardUrl(canvas.toDataURL('image/png'));
  }, [isOpen, date, sheet, subjects, streakCount, formattedDate]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!cardUrl) return;
    const a = document.createElement('a');
    a.href = cardUrl;
    a.download = `kplanner_card_${date}.png`;
    a.click();
    triggerHaptic('success');
  };

  const handleShare = async () => {
    if (!cardUrl) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        const blob = await (await fetch(cardUrl)).blob();
        const file = new File([blob], `kplanner_${date}.png`, { type: 'image/png' });
        await navigator.share({
          title: `K-Planner Study Summary - ${date}`,
          text: `Studied ${formatStudyDuration(sheet.totalMinutesStudied ?? 0, 'standard')} today!`,
          files: [file],
        });
        triggerHaptic('success');
      } catch {
        // Fall back to download
        handleDownload();
      }
    } else {
      handleDownload();
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-[#C2D8FC] dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 max-h-[92vh] flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-[#E4EDFC] dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E4EDFC] dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-[#9FC6FC]">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Studygram Card
              </h3>
              <p className="text-[10px] text-slate-400">Shareable vertical 9:16 summary</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Canvas & Preview */}
        <div className="relative w-full flex justify-center overflow-hidden rounded-2xl border border-[#C2D8FC] dark:border-slate-800 bg-slate-50 shadow-inner">
          <canvas
            ref={canvasRef}
            className="w-[220px] h-[391px] rounded-xl shadow-md object-contain"
          />
        </div>

        {/* Buttons */}
        <div className="w-full grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Save PNG</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Share2 size={14} />
            <span>Share Story</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
