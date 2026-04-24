'use client';
import { useState, useEffect, useCallback } from 'react';
import ReactFlow, { Background, Controls, Node, Edge, BackgroundVariant } from 'reactflow';
import 'reactflow/dist/style.css';
import SkillNode from '@/components/SkillNode';
import { Network, Search, Target, Zap, RefreshCw, Loader2, AlertTriangle, BookOpen, Brain, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getStudentDashboard, getSkillGraph, generateSkillGraph } from '@/services/apiClient';

const nodeTypes = { skill: SkillNode };

export default function KnowledgeGraphPage() {
  const { user } = useAuth();
  const studentId = user?.id || '';
  const isTeacher = user?.role === 'teacher';

  // Data state
  const [learningModules, setLearningModules] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ReactFlow state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Load learning modules on mount
  useEffect(() => {
    if (!studentId || isTeacher) return;
    getStudentDashboard(studentId)
      .then((d) => {
        setLearningModules(d.learning_progress || []);
        if (d.learning_progress?.length > 0 && !selectedCourse) {
          setSelectedCourse(d.learning_progress[0].course_module_name);
        }
      })
      .catch((err) => console.error('Lỗi tải modules:', err));
  }, [studentId, isTeacher]);

  // Fetch graph when course changes
  useEffect(() => {
    if (!selectedCourse || !studentId) return;
    fetchGraph();
  }, [selectedCourse, studentId]);

  const fetchGraph = async () => {
    if (!selectedCourse || !studentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSkillGraph(studentId, selectedCourse);
      setGraphData(data);
      mapToReactFlow(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedCourse || !studentId) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await generateSkillGraph(studentId, selectedCourse);
      setGraphData(data);
      mapToReactFlow(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const mapToReactFlow = (data: any) => {
    if (!data?.nodes) return;

    const recommendedKey = data.recommended_next;

    const rfNodes: Node[] = data.nodes.map((n: any) => ({
      id: String(n.id),
      type: 'skill',
      position: { x: n.position_x, y: n.position_y },
      data: {
        label: n.name,
        status: n.status,
        mastery_pct: n.mastery_pct,
        recommended: n.key === recommendedKey,
      },
    }));

    const rfEdges: Edge[] = (data.edges || []).map((e: any) => {
      // Determine edge style based on source node status
      const sourceNode = data.nodes.find((n: any) => String(n.id) === String(e.source_node_id));
      const isMastered = sourceNode?.status === 'mastered';
      const isInProgress = sourceNode?.status === 'in-progress';

      return {
        id: String(e.id),
        source: String(e.source_node_id),
        target: String(e.target_node_id),
        animated: isMastered || isInProgress,
        style: {
          stroke: isMastered ? '#06b6d4' : isInProgress ? '#9333ea' : '#cbd5e1',
          strokeWidth: 2,
        },
      };
    });

    setNodes(rfNodes);
    setEdges(rfEdges);
  };

  // Stats
  const masteredCount = graphData?.nodes?.filter((n: any) => n.status === 'mastered').length || 0;
  const totalCount = graphData?.nodes?.length || 0;

  // Risk badge color
  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'high_risk': return 'bg-red-100 text-red-700';
      case 'moderate': return 'bg-amber-100 text-amber-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  if (isTeacher) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 font-semibold">
        Tính năng Knowledge Graph dành riêng cho Học sinh.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="bg-white rounded-4xl p-8 text-slate-800 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
        <div className="absolute -right-12.5 -top-12.5 opacity-5 pointer-events-none">
          <Network className="w-64 h-64 text-blue-600" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Dynamic Knowledge Graph</h1>
            </div>
            <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
              Xin chào {user?.full_name || 'Học sinh'}! AI phân tích năng lực của bạn và đề xuất lộ trình học tập cá nhân hóa cho từng khóa học.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 min-w-35">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Thành thạo</p>
              <p className="text-2xl font-bold text-cyan-600 flex items-center gap-2">
                {masteredCount} <span className="text-sm font-medium text-slate-500">/ {totalCount}</span>
              </p>
            </div>
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 min-w-35">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Khóa học</p>
              <p className="text-sm font-bold text-slate-800 mt-1 leading-tight">
                {selectedCourse ? selectedCourse.replace(/^\[.*?\]\s*/, '') : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6 flex-1 min-h-[600px]">
        
        {/* LEFT SIDEBAR: Course Selector */}
        <div className="w-72 bg-white rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" /> Khóa học
            </h3>
          </div>
          
          <div className="p-4 space-y-2 flex-1 overflow-y-auto">
            {learningModules.length > 0 ? (
              learningModules.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedCourse(m.course_module_name)}
                  className={`rounded-2xl p-4 cursor-pointer transition ${
                    selectedCourse === m.course_module_name
                      ? 'border-2 border-blue-600 bg-blue-50/30'
                      : 'border border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <h4 className="font-bold text-slate-800 text-xs leading-tight mb-2">
                    {m.course_module_name.replace(/^\[.*?\]\s*/, '')}
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${m.mastery_score || 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{m.mastery_score || 0}%</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${getRiskBadge(m.risk_level)}`}>
                      {m.risk_level === 'high_risk' ? 'Rủi ro cao' : m.risk_level === 'moderate' ? 'Cần chú ý' : 'Tốt'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">AI: {m.ai_dependency}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 py-10 text-xs font-bold italic">
                Bạn chưa tham gia khóa học nào.
              </p>
            )}
          </div>

          <div className="p-4 border-t bg-slate-50">
            <button
              onClick={handleRegenerate}
              disabled={generating || !selectedCourse}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {generating ? 'AI đang phân tích...' : 'Tạo lại lộ trình'}
            </button>
          </div>
        </div>

        {/* RIGHT: Graph Area */}
        <div className="flex-1 bg-white rounded-4xl overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">

          {/* Loading overlay */}
          {(loading || generating) && (
            <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-slate-600 font-semibold">{generating ? 'AI đang phân tích năng lực...' : 'Đang tải cây kỹ năng...'}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center gap-4">
              <AlertTriangle className="w-12 h-12 text-red-400" />
              <p className="text-red-600 font-bold text-sm">{error}</p>
              <button onClick={fetchGraph} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-sm">Thử lại</button>
            </div>
          )}

          {/* No course selected */}
          {!selectedCourse && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <Network className="w-16 h-16 text-slate-200" />
              <p className="font-semibold">Chọn một khóa học từ sidebar để xem lộ trình.</p>
            </div>
          )}

          {/* Legend */}
          {selectedCourse && (
            <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Mastered
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> In Progress
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-white px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">
                <Star className="w-3 h-3" /> Recommended
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Locked
              </div>
            </div>
          )}

          {/* React Flow */}
          {selectedCourse && nodes.length > 0 && (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
              minZoom={0.4}
              maxZoom={1.5}
            >
              <Background color="#cbd5e1" variant={BackgroundVariant.Dots} gap={24} size={2} />
              <Controls className="bg-white! border-slate-200! fill-slate-600! shadow-sm" />
            </ReactFlow>
          )}

          {/* AI Insight Overlay */}
          {graphData?.ai_insight && !loading && !generating && (
            <div className="absolute bottom-6 right-6 z-10 max-w-sm">
              <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-slate-800 text-sm">AI Insight</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium mb-3">
                  {graphData.ai_insight}
                </p>
                {graphData.weakness_areas?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Điểm yếu cần ôn</p>
                    <div className="flex flex-wrap gap-1.5">
                      {graphData.weakness_areas.map((w: string) => {
                        const node = graphData.nodes.find((n: any) => n.key === w);
                        return (
                          <span key={w} className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-red-100">
                            {node?.name || w}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {graphData.recommended_next && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Nên học tiếp</p>
                    <p className="text-sm font-bold text-slate-800">
                      ⭐ {graphData.nodes.find((n: any) => n.key === graphData.recommended_next)?.name || graphData.recommended_next}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
