'use client';

import { useState } from 'react';
import {
  Users, Code2, Briefcase, Star, Heart, Settings2,
  GripVertical, X, Zap, Mic, BarChart3, CheckCircle2,
  XCircle, Clock, ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type StageType = 'behavioral' | 'technical coding' | 'case simulation' | 'leadership' | 'culture fit' | 'custom';

interface Stage {
  id: string;
  type: StageType;
  aiAllowed: boolean;
  voicePreset: string;
  focusAreas: string[];
  passThreshold: number;
}

type TabId = 'builder' | 'results';

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_META: Record<StageType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  defaultFocus: string[];
}> = {
  behavioral: {
    label: 'Behavioral',
    icon: <Users className="w-4 h-4" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/35',
    defaultFocus: ['Communication', 'Teamwork', 'Conflict Resolution'],
  },
  'technical coding': {
    label: 'Technical Coding',
    icon: <Code2 className="w-4 h-4" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/35',
    defaultFocus: ['Data Structures', 'Algorithms', 'System Design'],
  },
  'case simulation': {
    label: 'Case Simulation',
    icon: <Briefcase className="w-4 h-4" />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/35',
    defaultFocus: ['Analysis', 'Business Acumen', 'Decision Making'],
  },
  leadership: {
    label: 'Leadership',
    icon: <Star className="w-4 h-4" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/35',
    defaultFocus: ['Vision', 'Team Management', 'Delegation'],
  },
  'culture fit': {
    label: 'Culture Fit',
    icon: <Heart className="w-4 h-4" />,
    color: 'text-pink-400',
    bg: 'bg-pink-500/15',
    border: 'border-pink-500/35',
    defaultFocus: ['Values Alignment', 'Collaboration', 'Adaptability'],
  },
  custom: {
    label: 'Custom',
    icon: <Settings2 className="w-4 h-4" />,
    color: 'text-slate-400',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/35',
    defaultFocus: ['Custom Topic'],
  },
};

const VOICE_PRESETS = ['Professional Male', 'Friendly Female', 'Academic', 'Dynamic'] as const;

const MOCK_CANDIDATES = [
  {
    name: 'Sarah Chen',
    role: 'Senior Engineer',
    fitScore: 92,
    status: 'passed' as const,
    stageScores: [88, 95, 82],
    time: '48 min',
  },
  {
    name: 'Marcus Lee',
    role: 'Mid Engineer',
    fitScore: 74,
    status: 'in_progress' as const,
    stageScores: [81, 70],
    time: '31 min',
  },
  {
    name: 'Priya Nair',
    role: 'Senior Engineer',
    fitScore: 61,
    status: 'rejected' as const,
    stageScores: [55, 63, 68],
    time: '52 min',
  },
];

const DEFAULT_STAGES: Stage[] = [
  { id: '1', type: 'behavioral', aiAllowed: false, voicePreset: 'Professional Male', focusAreas: ['Communication', 'Teamwork'], passThreshold: 70 },
  { id: '2', type: 'technical coding', aiAllowed: true, voicePreset: 'Academic', focusAreas: ['Algorithms', 'System Design'], passThreshold: 75 },
  { id: '3', type: 'case simulation', aiAllowed: false, voicePreset: 'Friendly Female', focusAreas: ['Analysis', 'Business Acumen'], passThreshold: 65 },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function PipelineDemo() {
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [selectedId, setSelectedId] = useState<string>('1');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('builder');

  const selectedStage = stages.find((s) => s.id === selectedId) ?? null;

  function addStage(type: StageType) {
    if (stages.length >= 6) return;
    const meta = STAGE_META[type];
    const newStage: Stage = {
      id: Date.now().toString(),
      type,
      aiAllowed: false,
      voicePreset: 'Professional Male',
      focusAreas: meta.defaultFocus.slice(0, 2),
      passThreshold: 70,
    };
    setStages((prev) => [...prev, newStage]);
    setSelectedId(newStage.id);
  }

  function removeStage(id: string) {
    const remaining = stages.filter((s) => s.id !== id);
    setStages(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? '');
  }

  function updateStage(id: string, updates: Partial<Stage>) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragOverIndex !== index) setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...stages];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    setStages(updated);
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/40 bg-slate-900 w-full">
      {/* Browser chrome bar */}
      <div className="h-10 bg-slate-800/80 border-b border-white/10 flex items-center px-4 gap-2 flex-shrink-0">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <div className="flex-1 mx-4">
          <div className="bg-slate-700/60 rounded-md px-3 py-1 text-xs text-slate-400 font-mono max-w-xs mx-auto text-center">
            aegishire.com/employer/jobs/new
          </div>
        </div>
        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-0.5">
          {(['builder', 'results'] as TabId[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'builder' ? 'Pipeline Builder' : 'Candidate Results'}
            </button>
          ))}
        </div>
      </div>

      {/* ── BUILDER TAB ── */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-[160px_1fr_200px] min-h-[420px]">

          {/* Stage Library */}
          <div className="border-r border-white/8 p-3 bg-slate-900/60">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-1">
              Stage Library
            </p>
            <div className="flex flex-col gap-1.5">
              {(Object.keys(STAGE_META) as StageType[]).map((type) => {
                const meta = STAGE_META[type];
                const disabled = stages.length >= 6;
                return (
                  <button
                    key={type}
                    onClick={() => addStage(type)}
                    disabled={disabled}
                    title={disabled ? 'Max 6 stages reached' : `Add ${meta.label} stage`}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left text-xs font-medium
                      transition-all duration-150 cursor-pointer
                      ${meta.bg} ${meta.border} ${meta.color}
                      hover:brightness-125 active:scale-95
                      disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100`}
                  >
                    <span className="flex-shrink-0">{meta.icon}</span>
                    <span className="truncate">{meta.label}</span>
                    <span className="ml-auto flex-shrink-0 opacity-50">+</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-600 mt-4 text-center leading-relaxed">
              {stages.length}/6 stages · drag to reorder
            </p>
          </div>

          {/* Pipeline Canvas */}
          <div className="p-4 border-r border-white/8 flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Interview Pipeline
            </p>

            {stages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 text-slate-500">
                <Settings2 className="w-7 h-7 mb-2 opacity-25" />
                <p className="text-xs text-center">Add stages from the library</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {stages.map((stage, index) => {
                  const meta = STAGE_META[stage.type];
                  const isSelected = stage.id === selectedId;
                  const isDragging = dragIndex === index;
                  const isTarget = dragOverIndex === index && dragIndex !== index;

                  return (
                    <div
                      key={stage.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedId(stage.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border
                        cursor-pointer select-none transition-all duration-150
                        ${isSelected ? `${meta.bg} ${meta.border}` : 'bg-slate-800/50 border-white/10 hover:border-white/20'}
                        ${isDragging ? 'opacity-40 scale-[0.97]' : ''}
                        ${isTarget ? 'border-blue-400/60 scale-[1.02] bg-blue-500/10' : ''}
                      `}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 cursor-grab" />
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.color}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white leading-none">
                          {index + 1}. {meta.label}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {stage.aiAllowed && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 font-medium">
                              <Zap className="w-2.5 h-2.5" /> AI On
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">{stage.passThreshold}% pass</span>
                          <span className="text-[10px] text-slate-600">{stage.voicePreset.split(' ')[0]}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeStage(stage.id); }}
                        className="w-5 h-5 flex items-center justify-center rounded-md text-slate-600
                          hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pipeline summary */}
            {stages.length > 0 && (
              <div className="mt-auto pt-3 border-t border-white/8 flex items-center gap-2">
                {stages.map((s, i) => {
                  const meta = STAGE_META[s.type];
                  return (
                    <div key={s.id} className="flex items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${meta.bg} ${meta.color}`}>
                        {i + 1}
                      </div>
                      {i < stages.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  );
                })}
                <span className="ml-auto text-[10px] text-slate-500">{stages.length} stage{stages.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Config Panel */}
          <div className="p-4 bg-slate-900/40">
            {selectedStage ? (
              <ConfigPanel
                stage={selectedStage}
                onUpdate={(updates) => updateStage(selectedStage.id, updates)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <Settings2 className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs text-center">Select a stage to configure</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RESULTS TAB ── */}
      {activeTab === 'results' && (
        <div className="p-5 min-h-[420px] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Candidate Results</p>
              <p className="text-xs text-slate-400 mt-0.5">AI-ranked · {stages.length}-stage pipeline</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 rounded-lg px-3 py-1.5 border border-white/10">
              <Clock className="w-3.5 h-3.5" />
              Live · 3 candidates
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {MOCK_CANDIDATES.map((c) => (
              <CandidateRow key={c.name} candidate={c} stageCount={stages.length} />
            ))}
          </div>

          {/* Stage column labels */}
          <div className="pt-3 border-t border-white/8">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-600">Stages scored:</span>
              {stages.slice(0, 3).map((s, i) => {
                const meta = STAGE_META[s.type];
                return (
                  <span key={s.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.bg} ${meta.color} border ${meta.border}`}>
                    {meta.icon} {i + 1}. {meta.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

function ConfigPanel({ stage, onUpdate }: { stage: Stage; onUpdate: (u: Partial<Stage>) => void }) {
  const meta = STAGE_META[stage.type];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Stage Config</p>

      {/* Stage type badge */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${meta.bg} ${meta.border}`}>
        <span className={meta.color}>{meta.icon}</span>
        <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
      </div>

      {/* AI Collaboration toggle */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Zap className="w-3 h-3 text-cyan-500" /> AI Collaboration Mode
        </label>
        <button
          onClick={() => onUpdate({ aiAllowed: !stage.aiAllowed })}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all
            ${stage.aiAllowed
              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
              : 'bg-slate-800/60 border-white/10 text-slate-400 hover:border-white/20'
            }`}
        >
          {/* Toggle pill */}
          <div className={`w-8 h-4 rounded-full relative flex-shrink-0 transition-colors ${stage.aiAllowed ? 'bg-cyan-500' : 'bg-slate-600'}`}>
            <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${stage.aiAllowed ? 'left-[18px]' : 'left-0.5'}`} />
          </div>
          {stage.aiAllowed ? 'Allowed & Assessed' : 'Not Allowed'}
        </button>
        {stage.aiAllowed && (
          <p className="text-[10px] text-cyan-500/70 leading-relaxed">
            AI usage becomes a scoring signal — candidates are evaluated on how they leverage it.
          </p>
        )}
      </div>

      {/* Voice preset */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Mic className="w-3 h-3" /> Interviewer Voice
        </label>
        <div className="grid grid-cols-2 gap-1">
          {VOICE_PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => onUpdate({ voicePreset: v })}
              className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all
                ${stage.voicePreset === v
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'bg-slate-800/40 border-white/10 text-slate-400 hover:border-white/20'
                }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Pass threshold */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <BarChart3 className="w-3 h-3" /> Pass Threshold —{' '}
          <span className="text-white normal-case font-bold">{stage.passThreshold}%</span>
        </label>
        <input
          type="range"
          min={50}
          max={95}
          step={5}
          value={stage.passThreshold}
          onChange={(e) => onUpdate({ passThreshold: Number(e.target.value) })}
          className="w-full accent-blue-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>Lenient</span>
          <span>Strict</span>
        </div>
      </div>

      {/* Focus areas */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Focus Areas</label>
        <div className="flex flex-wrap gap-1">
          {stage.focusAreas.map((area, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${meta.bg} ${meta.color} ${meta.border}`}
            >
              {area}
              <button
                onClick={() => onUpdate({ focusAreas: stage.focusAreas.filter((_, j) => j !== i) })}
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {stage.focusAreas.length < STAGE_META[stage.type].defaultFocus.length && (
            <button
              onClick={() => {
                const next = STAGE_META[stage.type].defaultFocus.find((f) => !stage.focusAreas.includes(f));
                if (next) onUpdate({ focusAreas: [...stage.focusAreas, next] });
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-dashed border-white/20 text-slate-500 hover:text-slate-300 hover:border-white/30 transition-all"
            >
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Candidate Row ────────────────────────────────────────────────────────────

const STATUS_META = {
  passed: { label: 'Passed', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  in_progress: { label: 'In Progress', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  rejected: { label: 'Rejected', icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
};

function CandidateRow({ candidate, stageCount }: { candidate: typeof MOCK_CANDIDATES[0]; stageCount: number }) {
  const status = STATUS_META[candidate.status];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-white/8 hover:border-white/15 transition-all">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
        {candidate.name.split(' ').map((n) => n[0]).join('')}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{candidate.name}</p>
        <p className="text-xs text-slate-500 truncate">{candidate.role}</p>
      </div>

      {/* Stage scores */}
      <div className="hidden sm:flex items-center gap-1.5">
        {Array.from({ length: Math.min(stageCount, 3) }).map((_, i) => {
          const score = candidate.stageScores[i];
          const color = score == null ? 'text-slate-600' : score >= 75 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
          return (
            <div key={i} className="text-center">
              <div className={`text-xs font-bold ${color}`}>
                {score != null ? score : '–'}
              </div>
              <div className="text-[9px] text-slate-600">S{i + 1}</div>
            </div>
          );
        })}
      </div>

      {/* Fit score */}
      <div className="text-center flex-shrink-0">
        <div className="text-sm font-black text-white">{candidate.fitScore}</div>
        <div className="text-[9px] text-slate-500">fit</div>
      </div>

      {/* Status badge */}
      <div className={`hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium flex-shrink-0 ${status.color} ${status.bg} ${status.border}`}>
        {status.icon}
        {status.label}
      </div>

      {/* Time */}
      <div className="text-[10px] text-slate-600 flex-shrink-0">{candidate.time}</div>
    </div>
  );
}
