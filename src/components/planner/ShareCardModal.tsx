import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DateString, DailySheet, GridCellKey } from '../../types';
import { useSubjectStore } from '../../store/useSubjectStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useDDayStore, calculateDDay } from '../../store/useDDayStore';
import { formatStudyDuration, parseDateString } from '../../utils/timeSlotMapper';
import { triggerHaptic } from '../../utils/haptics';
import { X, Download, Share2, Sparkles, Printer, Smartphone } from 'lucide-react';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: DateString;
  sheet: DailySheet;
}

type ExportFormat = 'story' | 'a4';

function drawHatchedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const step = 6;
  for (let offset = -h; offset < w + h; offset += step) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y + h);
    ctx.lineTo(x + offset + h, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function ShareCardModal({ isOpen, onClose, date, sheet }: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const subjects = useSubjectStore((state) => state.subjects);
  const ddayEvents = useDDayStore((state) => state.events);
  const { calculateStreak } = useGamificationStore();
  const { streakCount } = calculateStreak();

  const [exportFormat, setExportFormat] = useState<ExportFormat>('story');
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  const parsedDate = parseDateString(date);
  const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][parsedDate.getDay()];
  const formattedDate = `${parsedDate.getFullYear()}.${String(parsedDate.getMonth() + 1).padStart(2, '0')}.${String(parsedDate.getDate()).padStart(2, '0')} (${dayOfWeek})`;

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const subjectMap = new Map(subjects.map((s) => [s.id, s.color]));
    const subjectNameMap = new Map(subjects.map((s) => [s.id, s.name]));

    if (exportFormat === 'story') {
      // Standard 9:16 Vertical Story format (540x960)
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

      for (let h = 0; h < 24; h++) {
        const y = gridY + 10 + h * rowH;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 9px monospace';
        ctx.fillText(String(h).padStart(2, '0'), gridX + 8, y + 10);

        for (let t = 0; t < 6; t++) {
          const key = `${h}-${t}`;
          const cell = sheet.timeGrid?.[key as GridCellKey];
          const x = gridX + 30 + t * colW;

          ctx.strokeStyle = '#f1f5f9';
          ctx.strokeRect(x, y, colW, rowH);

          if (cell?.plannedSubjectId) {
            const pColor = subjectMap.get(cell.plannedSubjectId) || '#A5B4FC';
            drawHatchedRect(ctx, x + 1, y + 1, colW - 2, rowH - 2, pColor);
          }
          if (cell?.subjectId) {
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
    } else {
      // High-Resolution A4 Printable Sheet (1240 x 1754, standard 150 DPI)
      const width = 1240;
      const height = 1754;
      canvas.width = width;
      canvas.height = height;

      // Clean Pure White / Ivory Printable Background
      ctx.fillStyle = '#FAFBFD';
      ctx.fillRect(0, 0, width, height);

      // Outer Paper Margin Border
      ctx.strokeStyle = '#D1DCEE';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      // Inner Header Box
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(60, 60, width - 120, 150, 16);
      ctx.fill();
      ctx.strokeStyle = '#C2D8FC';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Planner Header Title
      ctx.fillStyle = '#1E3A8A';
      ctx.font = '900 24px Inter, sans-serif';
      ctx.fillText('K-PLANNER • DAILY STUDY SHEET (한국식 스터디 플래너)', 85, 105);

      // Date & Day
      ctx.fillStyle = '#334155';
      ctx.font = '800 18px monospace';
      ctx.fillText(`DATE: ${formattedDate}`, 85, 140);

      // Pinned D-Day Badges
      const pinnedDDay = ddayEvents.filter((e) => e.isPinned);
      let ddayX = 85;
      pinnedDDay.slice(0, 3).forEach((ev) => {
        const dday = calculateDDay(ev.targetDate, date);
        const pillText = `${dday.label} ${ev.title}`;

        ctx.fillStyle = '#EFF6FF';
        ctx.beginPath();
        ctx.roundRect(ddayX, 155, 140, 32, 12);
        ctx.fill();
        ctx.strokeStyle = '#93C5FD';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#1D4ED8';
        ctx.font = '700 12px Inter, sans-serif';
        ctx.fillText(pillText.length > 18 ? pillText.slice(0, 16) + '..' : pillText, ddayX + 10, 176);
        ddayX += 150;
      });

      // Total Studied Time Box
      ctx.fillStyle = '#EFF6FF';
      ctx.beginPath();
      ctx.roundRect(width - 430, 80, 200, 110, 14);
      ctx.fill();
      ctx.strokeStyle = '#BFDBFE';
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '700 12px Inter, sans-serif';
      ctx.fillText('TOTAL STUDY TIME', width - 410, 108);

      const totalDuration = formatStudyDuration(sheet.totalMinutesStudied ?? 0, 'standard');
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 28px monospace';
      ctx.fillText(totalDuration, width - 410, 148);

      const blockCount = Math.round((sheet.totalMinutesStudied ?? 0) / 10);
      ctx.fillStyle = '#64748B';
      ctx.font = '600 12px monospace';
      ctx.fillText(`${blockCount} blocks (10m)`, width - 410, 172);

      // Rubber Completion Stamp (Red stamp on top right)
      if (sheet.completionStamp) {
        ctx.save();
        ctx.translate(width - 150, 135);
        ctx.rotate(-0.06);
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(-65, -30, 130, 60);
        ctx.setLineDash([]);
        ctx.fillStyle = '#BE123C';
        ctx.font = '900 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★ VERIFIED ★', 0, -8);
        ctx.font = '800 12px Inter, sans-serif';
        ctx.fillText(sheet.completionStamp.toUpperCase(), 0, 14);
        ctx.restore();
      }

      // Main Goal Banner
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(60, 230, width - 120, 60, 12);
      ctx.fill();
      ctx.strokeStyle = '#C2D8FC';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '800 12px Inter, sans-serif';
      ctx.fillText('MAIN FOCUS & TODAY\'S GOAL:', 80, 255);

      ctx.fillStyle = sheet.mainGoal ? '#0F172A' : '#94A3B8';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText(sheet.mainGoal || '(No primary goal written for today)', 80, 275);

      // Left Column: Checklist & Tasks Table (x: 60 to 570, width: 510)
      const leftX = 60;
      const leftY = 310;
      const leftW = 510;
      const leftH = 1080;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(leftX, leftY, leftW, leftH, 16);
      ctx.fill();
      ctx.strokeStyle = '#C2D8FC';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Checklist Header
      ctx.fillStyle = '#EFF6FF';
      ctx.beginPath();
      ctx.roundRect(leftX, leftY, leftW, 40, [16, 16, 0, 0]);
      ctx.fill();
      ctx.strokeStyle = '#C2D8FC';
      ctx.stroke();

      ctx.fillStyle = '#1E3A8A';
      ctx.font = '800 14px Inter, sans-serif';
      ctx.fillText('TASK CHECKLIST & GOALS', leftX + 20, leftY + 25);

      // Draw Tasks Rows (up to 20 lines)
      const tasks = sheet.tasks || [];
      const rowHeight = 50;
      const totalTaskRows = 20;

      for (let i = 0; i < totalTaskRows; i++) {
        const rowY = leftY + 40 + i * rowHeight;
        const task = tasks[i];

        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftX, rowY + rowHeight);
        ctx.lineTo(leftX + leftW, rowY + rowHeight);
        ctx.stroke();

        // Checkbox square
        ctx.strokeStyle = '#94A3B8';
        ctx.strokeRect(leftX + 20, rowY + 16, 18, 18);

        if (task) {
          if (task.isCompleted) {
            ctx.fillStyle = '#10B981';
            ctx.fillRect(leftX + 20, rowY + 16, 18, 18);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 12px Inter, sans-serif';
            ctx.fillText('✓', leftX + 24, rowY + 30);
          }

          // Subject color dot & tag
          const subColor = subjectMap.get(task.subjectId) || '#94A3B8';
          const subName = subjectNameMap.get(task.subjectId) || 'General';

          ctx.fillStyle = subColor;
          ctx.beginPath();
          ctx.arc(leftX + 56, rowY + 25, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#475569';
          ctx.font = '700 11px Inter, sans-serif';
          ctx.fillText(`[${subName}]`, leftX + 68, rowY + 29);

          // Title
          ctx.fillStyle = task.isCompleted ? '#94A3B8' : '#0F172A';
          ctx.font = task.isCompleted ? '500 13px Inter, sans-serif' : '600 13px Inter, sans-serif';
          const title = task.title;
          ctx.fillText(title.length > 32 ? title.slice(0, 30) + '...' : title, leftX + 155, rowY + 29);
        } else {
          // Empty dotted line for physical writing when printed
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#CBD5E1';
          ctx.beginPath();
          ctx.moveTo(leftX + 50, rowY + 32);
          ctx.lineTo(leftX + leftW - 20, rowY + 32);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Right Column: 24-Hour x 6 Ten-Minute Matrix (x: 590 to 1180, width: 590)
      const rightX = 590;
      const rightY = 310;
      const rightW = 590;
      const rightH = 1080;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(rightX, rightY, rightW, rightH, 16);
      ctx.fill();
      ctx.strokeStyle = '#C2D8FC';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Matrix Header
      ctx.fillStyle = '#EFF6FF';
      ctx.beginPath();
      ctx.roundRect(rightX, rightY, rightW, 40, [16, 16, 0, 0]);
      ctx.fill();
      ctx.strokeStyle = '#C2D8FC';
      ctx.stroke();

      ctx.fillStyle = '#1E3A8A';
      ctx.font = '800 14px Inter, sans-serif';
      ctx.fillText('10-MIN STUDY MATRIX (24 HOURS • PLAN & ACTUAL)', rightX + 20, rightY + 25);

      // Grid header (H label + 10, 20, 30, 40, 50, 60 columns)
      const matrixTableY = rightY + 50;
      const matrixColW = (rightW - 70) / 6;
      const matrixRowH = 34;

      ctx.fillStyle = '#64748B';
      ctx.font = '700 11px monospace';
      ctx.fillText('HOUR', rightX + 16, matrixTableY + 18);
      [10, 20, 30, 40, 50, 60].forEach((m, idx) => {
        ctx.fillText(`${m}m`, rightX + 65 + idx * matrixColW + matrixColW / 2 - 12, matrixTableY + 18);
      });

      // 24 Hour Rows
      for (let h = 0; h < 24; h++) {
        const rowY = matrixTableY + 26 + h * matrixRowH;

        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(rightX + 10, rowY, 45, matrixRowH - 2);
        ctx.strokeStyle = '#E2E8F0';
        ctx.strokeRect(rightX + 10, rowY, 45, matrixRowH - 2);

        ctx.fillStyle = '#334155';
        ctx.font = '800 12px monospace';
        ctx.fillText(String(h).padStart(2, '0') + 'h', rightX + 18, rowY + 21);

        for (let t = 0; t < 6; t++) {
          const key = `${h}-${t}`;
          const cell = sheet.timeGrid?.[key as GridCellKey];
          const cellX = rightX + 60 + t * matrixColW;
          const cellW = matrixColW - 4;
          const cellH = matrixRowH - 4;

          ctx.strokeStyle = '#E2E8F0';
          ctx.strokeRect(cellX, rowY + 1, cellW, cellH);

          // 1. Draw Plan Hatching if plannedSubjectId is set
          if (cell?.plannedSubjectId) {
            const planColor = subjectMap.get(cell.plannedSubjectId) || '#A5B4FC';
            drawHatchedRect(ctx, cellX, rowY + 1, cellW, cellH, planColor);
          }

          // 2. Draw Actual Solid Fill if subjectId is set
          if (cell?.subjectId) {
            const actualColor = subjectMap.get(cell.subjectId) || '#9FC6FC';
            ctx.fillStyle = actualColor;
            const fillRatio = cell.fillRatio ?? 1.0;
            ctx.fillRect(cellX, rowY + 1 + (1 - fillRatio) * cellH, cellW, cellH * fillRatio);
          }

          // 3. Draw subtle timer verified dot
          if (cell?.isVerifiedTimer) {
            ctx.fillStyle = '#10B981';
            ctx.beginPath();
            ctx.arc(cellX + cellW - 5, rowY + 6, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Matrix Legend at bottom of matrix box
      const legendY = matrixTableY + 26 + 24 * matrixRowH + 12;
      ctx.fillStyle = '#64748B';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillText('SUBJECT LEGEND:', rightX + 15, legendY);

      let legX = rightX + 120;
      subjects.slice(0, 5).forEach((sub) => {
        ctx.fillStyle = sub.color;
        ctx.beginPath();
        ctx.arc(legX, legendY - 4, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1E293B';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillText(sub.name, legX + 10, legendY);
        legX += 85;
      });

      // Bottom Area: 6 Classic Memo Boxes (y: 1410 to 1670, height: 260)
      const memoY = 1410;
      const memoW = (width - 120 - 5 * 14) / 6;
      const memoH = 260;
      const defaultLabels = ['Notes', 'Review', 'Mistakes', 'Assignments', 'Mindset', 'Tomorrow'];
      const labels = sheet.memoLabels || defaultLabels;
      const memos = sheet.bottomMemos || ['', '', '', '', '', ''];

      for (let i = 0; i < 6; i++) {
        const boxX = 60 + i * (memoW + 14);

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(boxX, memoY, memoW, memoH, 12);
        ctx.fill();
        ctx.strokeStyle = '#C2D8FC';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Box Header
        ctx.fillStyle = '#EFF6FF';
        ctx.beginPath();
        ctx.roundRect(boxX, memoY, memoW, 30, [12, 12, 0, 0]);
        ctx.fill();
        ctx.strokeStyle = '#C2D8FC';
        ctx.stroke();

        ctx.fillStyle = '#1E3A8A';
        ctx.font = '700 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i]?.toUpperCase() || (defaultLabels[i]?.toUpperCase() ?? ''), boxX + memoW / 2, memoY + 20);
        ctx.textAlign = 'left';

        // Content or writing lines
        const content = memos[i] ?? '';
        if (content && content.trim()) {
          ctx.fillStyle = '#1E293B';
          ctx.font = '500 12px Inter, sans-serif';
          // Wrap text into multiple lines
          const words = content.split(' ');
          let line = '';
          let lineY = memoY + 50;
          for (const word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > memoW - 16) {
              ctx.fillText(line, boxX + 8, lineY);
              line = word + ' ';
              lineY += 18;
              if (lineY > memoY + memoH - 10) break;
            } else {
              line = testLine;
            }
          }
          if (lineY <= memoY + memoH - 10) {
            ctx.fillText(line, boxX + 8, lineY);
          }
        } else {
          // Blank lines for printing
          ctx.strokeStyle = '#E2E8F0';
          ctx.setLineDash([2, 3]);
          for (let l = 0; l < 8; l++) {
            const lY = memoY + 50 + l * 24;
            ctx.beginPath();
            ctx.moveTo(boxX + 10, lY);
            ctx.lineTo(boxX + memoW - 10, lY);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }
      }

      // Page Footer & Watermark
      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Generated with K-Planner • High-Resolution A4 Printable Korean Study Sheet', width / 2, height - 50);
      ctx.textAlign = 'left';
    }

    setCardUrl(canvas.toDataURL('image/png'));
  }, [isOpen, date, sheet, subjects, streakCount, formattedDate, exportFormat, ddayEvents]);


  const handleDownload = async () => {
    if (!cardUrl) return;
    const filename =
      exportFormat === 'story'
        ? `kplanner_story_${date}.png`
        : `kplanner_sheet_A4_${date}.png`;

    try {
      const response = await fetch(cardUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      setCopiedStatus('Saved image!');
      setTimeout(() => setCopiedStatus(null), 2500);
      triggerHaptic('success');
    } catch {
      const a = document.createElement('a');
      a.href = cardUrl;
      a.download = filename;
      a.click();
      triggerHaptic('success');
    }
  };

  const handleShare = async () => {
    if (!cardUrl) return;
    const filename =
      exportFormat === 'story'
        ? `kplanner_story_${date}.png`
        : `kplanner_sheet_A4_${date}.png`;

    try {
      const blob = await (await fetch(cardUrl)).blob();
      const file = new File([blob], filename, { type: 'image/png' });

      if (
        typeof navigator !== 'undefined' &&
        'canShare' in navigator &&
        (navigator as any).canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `K-Planner Study Summary - ${date}`,
          text: `Studied ${formatStudyDuration(sheet.totalMinutesStudied ?? 0, 'standard')} today!`,
          files: [file],
        });
        setCopiedStatus('Shared successfully!');
        setTimeout(() => setCopiedStatus(null), 2500);
        triggerHaptic('success');
        return;
      }

      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({
          title: `K-Planner Study Summary - ${date}`,
          text: `Studied ${formatStudyDuration(sheet.totalMinutesStudied ?? 0, 'standard')} today!`,
        });
        setCopiedStatus('Shared successfully!');
        setTimeout(() => setCopiedStatus(null), 2500);
        triggerHaptic('success');
        return;
      }
    } catch (e) {
      console.warn('Share error, attempting clipboard/download fallback:', e);
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard && 'write' in navigator.clipboard) {
      try {
        const blob = await (await fetch(cardUrl)).blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedStatus('Copied image to clipboard!');
        setTimeout(() => setCopiedStatus(null), 2500);
        triggerHaptic('success');
        return;
      } catch {
        // Fall back to download
      }
    }

    handleDownload();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="bg-white dark:bg-slate-900 border border-[#C2D8FC] dark:border-slate-800 rounded-3xl p-4 sm:p-5 w-full max-w-sm sm:max-w-md shadow-2xl space-y-3.5 max-h-[92vh] flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-[#E4EDFC] dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E4EDFC] dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-[#9FC6FC]">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {exportFormat === 'story' ? 'Studygram Card' : 'Printable A4 Sheet'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {exportFormat === 'story' ? '9:16 Social Story format' : 'Complete Korean Study Planner Layout'}
              </p>
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

        {/* Phase 4.3 Format Selector Toggle */}
        <div className="w-full flex items-center bg-[#E4EDFC]/80 dark:bg-slate-800 p-0.5 rounded-2xl border border-[#C2D8FC] dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setExportFormat('story');
              triggerHaptic('light');
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              exportFormat === 'story'
                ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone size={13} />
            <span>Story (9:16)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setExportFormat('a4');
              triggerHaptic('light');
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              exportFormat === 'a4'
                ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Printer size={13} />
            <span>A4 Printable</span>
          </button>
        </div>

        {copiedStatus && (
          <div className="w-full py-1 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center animate-in fade-in">
            {copiedStatus}
          </div>
        )}

        {/* Canvas & Preview */}
        <div className="relative w-full flex justify-center items-center overflow-hidden rounded-2xl border border-[#C2D8FC] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-inner p-2 min-h-[300px]">
          <canvas
            ref={canvasRef}
            className={`rounded-xl shadow-md object-contain max-h-[46vh] ${
              exportFormat === 'story' ? 'w-[180px] h-[320px]' : 'w-[230px] h-[325px]'
            }`}
          />
        </div>

        {/* Buttons */}
        <div className="w-full grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#E4EDFC] hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer shadow-xs active:scale-98"
          >
            <Download size={15} />
            <span>Download PNG</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 dark:bg-[#9FC6FC] dark:hover:bg-blue-300 text-white dark:text-slate-900 rounded-2xl text-xs font-bold transition-colors cursor-pointer shadow-xs active:scale-98"
          >
            <Share2 size={15} />
            <span>Share / Copy</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
