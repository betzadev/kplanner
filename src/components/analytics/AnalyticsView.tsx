import { usePlannerStore } from '../../store/usePlannerStore';
import { useTotalTimeCalculator } from '../../hooks/useTotalTimeCalculator';
import { formatStudyDuration, parseDateString, toDateString } from '../../utils/timeSlotMapper';
import { ChevronLeft, ChevronRight, BarChart3, Clock } from 'lucide-react';

export function AnalyticsView() {
  const currentDate = usePlannerStore((state) => state.currentDate);
  const setCurrentDate = usePlannerStore((state) => state.setCurrentDate);
  const { totalMinutes, breakdown } = useTotalTimeCalculator(currentDate);

  const parsedDate = parseDateString(currentDate);
  const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][parsedDate.getDay()];
  const formattedDate = `${parsedDate.getFullYear()}.${String(parsedDate.getMonth() + 1).padStart(2, '0')}.${String(parsedDate.getDate()).padStart(2, '0')} (${dayOfWeek})`;

  const handlePrevDay = () => {
    const prev = new Date(parsedDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(toDateString(prev));
  };

  const handleNextDay = () => {
    const next = new Date(parsedDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(toDateString(next));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Date Header for Analytics */}
      <div className="bg-white border border-slate-300 rounded-md p-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-100 rounded text-slate-700">
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Study Analytics & Report</h2>
            <p className="text-[10px] text-slate-500">10-minute interval breakdown</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-slate-800 font-mono px-1">
            {formattedDate}
          </span>
          <button
            type="button"
            onClick={handleNextDay}
            className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main KPI Card */}
      <div className="bg-white border border-slate-300 rounded-md p-5 shadow-xs">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
          Today's Total Study Time / 총 공부 시간
        </span>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-extrabold text-slate-900 font-mono">
            {formatStudyDuration(totalMinutes, 'korean')}
          </span>
          <span className="text-sm font-medium text-slate-400">
            ({formatStudyDuration(totalMinutes, 'digital')})
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
          <Clock size={13} className="text-slate-400" />
          Calculated dynamically from {Math.round(totalMinutes / 10)} filled 10-minute blocks
        </p>

        {/* Visual Progress Ratio Bar */}
        {totalMinutes > 0 && (
          <div className="mt-4">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              {breakdown.map((item) => (
                <div
                  key={item.subjectId}
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                  title={`${item.subjectName}: ${item.minutes}m (${item.percentage}%)`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Subject Breakdown List */}
      <div className="bg-white border border-slate-300 rounded-md p-4 shadow-xs">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-3">
          Subject Breakdown / 과목별 비중
        </span>

        {breakdown.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic">
            No study sessions recorded for this date yet. Use the Planner or Timer to log your study time!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {breakdown.map((item) => (
              <div key={item.subjectId} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">{item.subjectName}</div>
                    <div className="text-[10px] text-slate-400">{Math.round(item.minutes / 10)} blocks (10m each)</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-slate-800 font-mono">
                      {formatStudyDuration(item.minutes, 'digital')}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold">{item.percentage}%</div>
                  </div>
                  <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
