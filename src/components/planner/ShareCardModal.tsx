import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DateString, DailySheet, GridCellKey } from '../../types';
import { useSubjectStore } from '../../store/useSubjectStore';
import { useGamificationStore } from '../../store/useGamificationStore';
import { useDDayStore, calculateDDay } from '../../store/useDDayStore';
import { formatStudyDuration, parseDateString } from '../../utils/timeSlotMapper';
import { triggerHaptic } from '../../utils/haptics';
import { X, Download, Share2, Sparkles, Printer, Smartphone, Check, AlertCircle } from 'lucide-react';
import { useLanguageStore } from '../../store/useLanguageStore';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: DateString;
  sheet: DailySheet;
}

type ExportFormat = 'story' | 'a4';

/**
 * Universal cross-platform rounded rectangle drawing helper for HTML5 Canvas.
 * Supports numbers and 4-corner radius arrays without relying on experimental ctx.roundRect.
 */
function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: number | number[]
) {
  let rTopLeft = 0;
  let rTopRight = 0;
  let rBottomRight = 0;
  let rBottomLeft = 0;

  if (typeof radii === 'number') {
    const maxR = Math.min(Math.abs(w) / 2, Math.abs(h) / 2);
    rTopLeft = rTopRight = rBottomRight = rBottomLeft = Math.min(Math.max(0, radii), maxR);
  } else if (Array.isArray(radii)) {
    const maxR = Math.min(Math.abs(w) / 2, Math.abs(h) / 2);
    if (radii.length === 1) {
      rTopLeft = rTopRight = rBottomRight = rBottomLeft = Math.min(Math.max(0, radii[0] ?? 0), maxR);
    } else if (radii.length === 2) {
      rTopLeft = rBottomRight = Math.min(Math.max(0, radii[0] ?? 0), maxR);
      rTopRight = rBottomLeft = Math.min(Math.max(0, radii[1] ?? 0), maxR);
    } else if (radii.length >= 4) {
      rTopLeft = Math.min(Math.max(0, radii[0] ?? 0), maxR);
      rTopRight = Math.min(Math.max(0, radii[1] ?? 0), maxR);
      rBottomRight = Math.min(Math.max(0, radii[2] ?? 0), maxR);
      rBottomLeft = Math.min(Math.max(0, radii[3] ?? 0), maxR);
    }
  }

  ctx.beginPath();
  ctx.moveTo(x + rTopLeft, y);
  ctx.lineTo(x + w - rTopRight, y);
  ctx.arcTo(x + w, y, x + w, y + rTopRight, rTopRight);
  ctx.lineTo(x + w, y + h - rBottomRight);
  ctx.arcTo(x + w, y + h, x + w - rBottomRight, y + h, rBottomRight);
  ctx.lineTo(x + rBottomLeft, y + h);
  ctx.arcTo(x, y + h, x, y + h - rBottomLeft, rBottomLeft);
  ctx.lineTo(x, y + rTopLeft);
  ctx.arcTo(x, y, x + rTopLeft, y, rTopLeft);
  ctx.closePath();
}

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

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const byteString = atob(parts[1] || '');
  const mimeString = parts[0]?.split(':')[1]?.split(';')[0] || 'image/png';
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

export function ShareCardModal({ isOpen, onClose, date, sheet }: ShareCardModalProps) {
  const t = useLanguageStore((state) => state.t);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const subjects = useSubjectStore((state) => state.subjects);
  const ddayEvents = useDDayStore((state) => state.events);
  const { calculateStreak } = useGamificationStore();
  const { streakCount = 0 } = calculateStreak ? calculateStreak() : { streakCount: 0 };

  const [exportFormat, setExportFormat] = useState<ExportFormat>('story');
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedDate = parseDateString(date);
  const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][parsedDate.getDay()];
  const formattedDate = `${parsedDate.getFullYear()}.${String(parsedDate.getMonth() + 1).padStart(2, '0')}.${String(parsedDate.getDate()).padStart(2, '0')} (${dayOfWeek})`;

  useEffect(() => {
    if (!isOpen) return;

    try {
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
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        drawRoundedRectPath(ctx, 30, 40, width - 60, height - 80, 28);
        ctx.fill();
        ctx.strokeStyle = '#C2D8FC';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Top Header
        ctx.fillStyle = '#1e3a8a';
        ctx.font = '900 16px Inter, -apple-system, sans-serif';
        ctx.fillText('K-PLANNER • STUDYGRAM', 60, 85);

        // Date
        ctx.fillStyle = '#64748b';
        ctx.font = '700 13px Inter, monospace';
        ctx.fillText(formattedDate, 60, 110);

        // Streak Pill
        ctx.fillStyle = '#FFF1C5';
        drawRoundedRectPath(ctx, width - 170, 70, 110, 32, 16);
        ctx.fill();
        ctx.strokeStyle = '#FDE2E4';
        ctx.stroke();

        ctx.fillStyle = '#b45309';
        ctx.font = '900 13px Inter, monospace';
        ctx.fillText(`🔥 ${streakCount} DAYS`, width - 158, 91);

        // Total Study Time Banner
        ctx.fillStyle = '#F0F5FD';
        drawRoundedRectPath(ctx, 50, 140, width - 100, 85, 20);
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
        drawRoundedRectPath(ctx, 50, 265, width - 100, 48, 14);
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
        drawRoundedRectPath(ctx, gridX, gridY, gridW, 24 * rowH + 20, 14);
        ctx.fill();
        ctx.strokeStyle = '#C2D8FC';
        ctx.lineWidth = 1;
        ctx.stroke();

        for (let h = 0; h < 24; h++) {
          const y = gridY + 10 + h * rowH;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '700 9px monospace';
          ctx.fillText(String(h).padStart(2, '0'), gridX + 8, y + 10);

          for (let tIdx = 0; tIdx < 6; tIdx++) {
            const key = `${h}-${tIdx}`;
            const cell = sheet.timeGrid?.[key as GridCellKey];
            const x = gridX + 30 + tIdx * colW;

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
        drawRoundedRectPath(ctx, 60, 60, width - 120, 150, 16);
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
          drawRoundedRectPath(ctx, ddayX, 155, 140, 32, 12);
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
        drawRoundedRectPath(ctx, width - 430, 80, 200, 110, 14);
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

        // Rubber Completion Stamp
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
        drawRoundedRectPath(ctx, 60, 230, width - 120, 60, 12);
        ctx.fill();
        ctx.strokeStyle = '#C2D8FC';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '800 12px Inter, sans-serif';
        ctx.fillText("MAIN FOCUS & TODAY'S GOAL:", 80, 255);

        ctx.fillStyle = sheet.mainGoal ? '#0F172A' : '#94A3B8';
        ctx.font = '600 15px Inter, sans-serif';
        ctx.fillText(sheet.mainGoal || '(No primary goal written for today)', 80, 275);

        // Left Column: Checklist & Tasks Table
        const leftX = 60;
        const leftY = 310;
        const leftW = 510;
        const leftH = 1080;

        ctx.fillStyle = '#FFFFFF';
        drawRoundedRectPath(ctx, leftX, leftY, leftW, leftH, 16);
        ctx.fill();
        ctx.strokeStyle = '#C2D8FC';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Checklist Header
        ctx.fillStyle = '#EFF6FF';
        drawRoundedRectPath(ctx, leftX, leftY, leftW, 40, [16, 16, 0, 0]);
        ctx.fill();
        ctx.strokeStyle = '#C2D8FC';
        ctx.stroke();

        ctx.fillStyle = '#1E3A8A';
        ctx.font = '800 14px Inter, sans-serif';
        ctx.fillText('TASK CHECKLIST & GOALS', leftX + 20, leftY + 25);

        // Tasks Rows
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

            const subColor = subjectMap.get(task.subjectId) || '#94A3B8';
            const subName = subjectNameMap.get(task.subjectId) || 'General';

            ctx.fillStyle = subColor;
            ctx.beginPath();
            ctx.arc(leftX + 56, rowY + 25, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#475569';
            ctx.font = '700 11px Inter, sans-serif';
            ctx.fillText(`[${subName}]`, leftX + 68, rowY + 29);

            ctx.fillStyle = task.isCompleted ? '#94A3B8' : '#0F172A';
            ctx.font = task.isCompleted ? '500 13px Inter, sans-serif' : '600 13px Inter, sans-serif';
            const title = task.title;
            ctx.fillText(title.length > 32 ? title.slice(0, 30) + '...' : title, leftX + 155, rowY + 29);
          } else {
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = '#CBD5E1';
            ctx.beginPath();
            ctx.moveTo(leftX + 50, rowY + 32);
            ctx.lineTo(leftX + leftW - 20, rowY + 32);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // Right Column: 24-Hour Matrix
        const rightX = 590;
        const rightY = 310;
        const rightW = 590;
        const rightH = 1080;

        ctx.fillStyle = '#FFFFFF';
        drawRoundedRectPath(ctx, rightX, rightY, rightW, rightH, 16);
        ctx.fill();
        ctx.strokeStyle = '#C2D8FC';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Matrix Header
        ctx.fillStyle = '#EFF6FF';
        drawRoundedRectPath(ctx, rightX, rightY, rightW, 40, [16, 16, 0, 0]);
        ctx.fill();
        ctx.strokeStyle = '#C2D8FC';
        ctx.stroke();

        ctx.fillStyle = '#1E3A8A';
        ctx.font = '800 14px Inter, sans-serif';
        ctx.fillText('10-MIN STUDY MATRIX (24 HOURS • PLAN & ACTUAL)', rightX + 20, rightY + 25);

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

          for (let tIdx = 0; tIdx < 6; tIdx++) {
            const key = `${h}-${tIdx}`;
            const cell = sheet.timeGrid?.[key as GridCellKey];
            const cellX = rightX + 60 + tIdx * matrixColW;
            const cellW = matrixColW - 4;
            const cellH = matrixRowH - 4;

            ctx.strokeStyle = '#E2E8F0';
            ctx.strokeRect(cellX, rowY + 1, cellW, cellH);

            if (cell?.plannedSubjectId) {
              const planColor = subjectMap.get(cell.plannedSubjectId) || '#A5B4FC';
              drawHatchedRect(ctx, cellX, rowY + 1, cellW, cellH, planColor);
            }

            if (cell?.subjectId) {
              const actualColor = subjectMap.get(cell.subjectId) || '#9FC6FC';
              ctx.fillStyle = actualColor;
              const fillRatio = cell.fillRatio ?? 1.0;
              ctx.fillRect(cellX, rowY + 1 + (1 - fillRatio) * cellH, cellW, cellH * fillRatio);
            }

            if (cell?.isVerifiedTimer) {
              ctx.fillStyle = '#10B981';
              ctx.beginPath();
              ctx.arc(cellX + cellW - 5, rowY + 6, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Subject Legend at bottom
        const legY = matrixTableY + 26 + 24 * matrixRowH + 12;
        ctx.fillStyle = '#64748B';
        ctx.font = '700 11px Inter, sans-serif';
        ctx.fillText('SUBJECT LEGEND:', rightX + 15, legY);

        let legX = rightX + 120;
        subjects.slice(0, 5).forEach((sub) => {
          ctx.fillStyle = sub.color;
          ctx.beginPath();
          ctx.arc(legX, legY - 4, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#1E293B';
          ctx.font = '600 11px Inter, sans-serif';
          ctx.fillText(sub.name, legX + 10, legY);
          legX += 85;
        });

        // Bottom Memo Boxes
        const memoY = 1410;
        const memoW = (width - 120 - 5 * 14) / 6;
        const memoH = 260;
        const defaultLabels = ['Notes', 'Review', 'Mistakes', 'Assignments', 'Mindset', 'Tomorrow'];
        const labels = sheet.memoLabels || defaultLabels;
        const memos = sheet.bottomMemos || ['', '', '', '', '', ''];

        for (let i = 0; i < 6; i++) {
          const boxX = 60 + i * (memoW + 14);

          ctx.fillStyle = '#FFFFFF';
          drawRoundedRectPath(ctx, boxX, memoY, memoW, memoH, 12);
          ctx.fill();
          ctx.strokeStyle = '#C2D8FC';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#EFF6FF';
          drawRoundedRectPath(ctx, boxX, memoY, memoW, 30, [12, 12, 0, 0]);
          ctx.fill();
          ctx.strokeStyle = '#C2D8FC';
          ctx.stroke();

          ctx.fillStyle = '#1E3A8A';
          ctx.font = '700 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(labels[i]?.toUpperCase() || (defaultLabels[i]?.toUpperCase() ?? ''), boxX + memoW / 2, memoY + 20);
          ctx.textAlign = 'left';

          const content = memos[i] ?? '';
          if (content && content.trim()) {
            ctx.fillStyle = '#1E293B';
            ctx.font = '500 12px Inter, sans-serif';
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
            ctx.setLineDash([2, 3]);
            ctx.strokeStyle = '#E2E8F0';
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

        // Page Footer
        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Generated with K-PLANNER • High-Resolution Korean Study Sheet', width / 2, height - 50);
        ctx.textAlign = 'left';
      }

      const generatedUrl = canvas.toDataURL('image/png');
      setCardUrl(generatedUrl);
      setErrorMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Canvas export generation error:', msg);
      setErrorMessage(`Export generation error: ${msg}`);
    }
  }, [isOpen, date, sheet, subjects, streakCount, formattedDate, exportFormat, ddayEvents]);

  const handleDownload = () => {
    if (!cardUrl) return;
    const filename =
      exportFormat === 'story'
        ? `kplanner_story_${date}.png`
        : `kplanner_sheet_A4_${date}.png`;

    try {
      const blob = dataUrlToBlob(cardUrl);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);

      setStatusMessage(t.savedImage);
      setTimeout(() => setStatusMessage(null), 3000);
      triggerHaptic('success');
    } catch {
      // Direct Data URI download fallback
      try {
        const a = document.createElement('a');
        a.href = cardUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setStatusMessage(t.savedImage);
        setTimeout(() => setStatusMessage(null), 3000);
        triggerHaptic('success');
      } catch (err) {
        setErrorMessage('Unable to auto-download. Please long-press or right-click the preview image to save.');
      }
    }
  };

  const handleShare = async () => {
    if (!cardUrl) return;
    const filename =
      exportFormat === 'story'
        ? `kplanner_story_${date}.png`
        : `kplanner_sheet_A4_${date}.png`;

    try {
      const blob = dataUrlToBlob(cardUrl);
      const file = new File([blob], filename, { type: 'image/png' });

      // 1. Web Share API with File support
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
        setStatusMessage(t.sharedSuccess);
        setTimeout(() => setStatusMessage(null), 3000);
        triggerHaptic('success');
        return;
      }

      // 2. Clipboard API support
      if (typeof navigator !== 'undefined' && navigator.clipboard && 'write' in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setStatusMessage(t.copiedClipboard);
        setTimeout(() => setStatusMessage(null), 3000);
        triggerHaptic('success');
        return;
      }
    } catch (e) {
      console.warn('Share error, attempting download fallback:', e);
    }

    // 3. Fallback to download
    handleDownload();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

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
                {exportFormat === 'story' ? t.studygramCard : t.printableSheet}
              </h3>
              <p className="text-[10px] text-slate-400">
                {exportFormat === 'story' ? '9:16 Social Story' : 'Korean 10-Minute Study Planner'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Format Selector */}
        <div className="w-full flex items-center bg-[#E4EDFC]/80 dark:bg-slate-800 p-0.5 rounded-2xl border border-[#C2D8FC] dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setExportFormat('story');
              triggerHaptic('light');
            }}
            className={`flex-1 min-h-[40px] py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              exportFormat === 'story'
                ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone size={14} />
            <span>{t.storyFormat}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setExportFormat('a4');
              triggerHaptic('light');
            }}
            className={`flex-1 min-h-[40px] py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              exportFormat === 'a4'
                ? 'bg-blue-600 dark:bg-[#9FC6FC] text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Printer size={14} />
            <span>{t.a4Format}</span>
          </button>
        </div>

        {statusMessage && (
          <div className="w-full py-1.5 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5 animate-in fade-in">
            <Check size={14} />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="w-full py-1.5 px-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-medium text-center flex items-center justify-center gap-1.5 animate-in fade-in">
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Canvas / Image Preview */}
        <div className="relative w-full flex flex-col justify-center items-center overflow-hidden rounded-2xl border border-[#C2D8FC] dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-inner p-2 min-h-[280px]">
          {/* Hidden Canvas used for accurate high-res pixel rasterization */}
          <canvas ref={canvasRef} className="hidden" />

          {/* User-visible image tag for tap-and-hold saving on mobile devices */}
          {cardUrl ? (
            <img
              src={cardUrl}
              alt="Study card preview"
              className={`rounded-xl shadow-md object-contain max-h-[46vh] ${
                exportFormat === 'story' ? 'w-[180px] h-[320px]' : 'w-[230px] h-[325px]'
              }`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 py-12 gap-2">
              <Sparkles size={24} className="animate-spin text-blue-500" />
              <span className="text-xs font-semibold">Generating high-res card...</span>
            </div>
          )}

          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center">
            {t.mobileSaveHint}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!cardUrl}
            className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#E4EDFC] hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer shadow-xs active:scale-98 disabled:opacity-40"
          >
            <Download size={16} />
            <span>{t.downloadPng}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!cardUrl}
            className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 dark:bg-[#9FC6FC] dark:hover:bg-blue-300 text-white dark:text-slate-900 rounded-2xl text-xs font-bold transition-colors cursor-pointer shadow-xs active:scale-98 disabled:opacity-40"
          >
            <Share2 size={16} />
            <span>{t.shareCopy}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
