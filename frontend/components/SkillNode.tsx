import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Lock, CheckCircle, Orbit, Star } from 'lucide-react';

interface SkillNodeProps {
  data: {
    label: string;
    status: 'locked' | 'in-progress' | 'mastered';
    mastery_pct?: number;
    recommended?: boolean;
  };
}

const SkillNode = ({ data }: SkillNodeProps) => {
  const isMastered = data.status === 'mastered';
  const isInProgress = data.status === 'in-progress';
  const isLocked = data.status === 'locked';
  const isRecommended = data.recommended;
  const pct = data.mastery_pct ?? 0;

  return (
    <div
      className={`relative rounded-2xl px-6 py-4 flex items-center gap-4 transition-all duration-300 w-64
        ${
          isRecommended
            ? 'bg-white border-2 border-amber-400 shadow-[0_8px_24px_rgba(245,158,11,0.25)] text-slate-800'
            : isMastered
            ? 'bg-white border-2 border-cyan-400 text-slate-800'
            : isInProgress
            ? 'bg-white border-2 border-purple-400 shadow-[0_8px_20px_rgba(168,85,247,0.15)] text-slate-800'
            : 'bg-slate-50 border border-slate-200 text-slate-400'
        }
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-2 !border-none" />
      
      {/* Icon Area */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative
          ${
            isRecommended
              ? 'bg-amber-100 text-amber-600'
              : isMastered
              ? 'bg-cyan-100 text-cyan-600'
              : isInProgress
              ? 'bg-purple-100 text-purple-600'
              : 'bg-slate-200 text-slate-500'
          }
        `}
      >
        {isRecommended ? (
          <Star className="w-6 h-6 animate-pulse" />
        ) : isMastered ? (
          <CheckCircle className="w-6 h-6" />
        ) : isInProgress ? (
          <Orbit className="w-6 h-6 animate-spin-slow" />
        ) : (
          <Lock className="w-5 h-5" />
        )}
        
        {/* Mastery ring overlay */}
        {!isLocked && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" opacity={0.15} />
            <circle
              cx="24" cy="24" r="21" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeDasharray={`${(pct / 100) * 132} 132`}
              strokeLinecap="round"
              opacity={0.6}
            />
          </svg>
        )}
      </div>

      {/* Text Area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="text-[10px] uppercase font-bold tracking-widest opacity-70">
            {isRecommended ? 'Nên học tiếp' : isMastered ? 'Thành thạo' : isInProgress ? 'Đang học' : 'Đã khoá'}
          </div>
          {!isLocked && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              isMastered ? 'bg-cyan-100 text-cyan-700' : isRecommended ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {pct}%
            </span>
          )}
        </div>
        <div className="font-bold text-sm leading-tight truncate">{data.label}</div>
      </div>

      {/* Recommended glow */}
      {isRecommended && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent to-amber-50/60 pointer-events-none"></div>
      )}
      {/* Mastered glow */}
      {isMastered && !isRecommended && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent to-cyan-50 pointer-events-none"></div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-2 !border-none" />
    </div>
  );
};

export default memo(SkillNode);
