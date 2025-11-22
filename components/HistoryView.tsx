
import React from 'react';
import { WorkoutHistoryItem } from '../types';
import { GlassCard } from './ui/GlassCard';
import { ArrowLeft, Calendar, Dumbbell, FileText, Trophy, Trash2 } from 'lucide-react';

interface HistoryViewProps {
  history: WorkoutHistoryItem[];
  onBack: () => void;
  onDelete: (timestamp: number) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onBack, onDelete }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-white">Lịch sử tập luyện</h2>
      </div>

      {history.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Chưa có dữ liệu tập luyện nào.</p>
          <p className="text-gray-500 text-sm mt-2">Hãy hoàn thành bài tập đầu tiên của bạn!</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <GlassCard key={item.timestamp} className="relative group">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                
                {/* Date Badge & Delete Column */}
                <div className="flex-shrink-0 flex flex-col items-center gap-3 z-10">
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-center w-24 shadow-inner shadow-cyan-500/5">
                    <Calendar className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                    <span className="text-xs text-cyan-200 font-bold block">{item.date}</span>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(item.timestamp);
                    }}
                    className="relative flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-red-400 bg-red-500/5 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-all duration-200 w-24 group/btn"
                    title="Xóa lịch sử ngày này"
                    type="button"
                  >
                    <Trash2 className="w-3 h-3 group-hover/btn:scale-110 transition-transform" /> Xóa
                  </button>
                </div>

                {/* Content */}
                <div className="flex-grow border-l border-white/5 md:pl-4 md:border-l-0 md:border-t-0 border-t pt-4 md:pt-0 opacity-90">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                       <h3 className="text-lg font-bold text-white">{item.summary}</h3>
                       <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mt-1 uppercase tracking-wider
                         ${item.levelSelected.includes('Hard') ? 'bg-red-500/20 text-red-300' : 
                           item.levelSelected.includes('Medium') ? 'bg-blue-500/20 text-blue-300' : 
                           'bg-green-500/20 text-green-300'}
                       `}>
                         {item.levelSelected}
                       </span>
                    </div>
                  </div>

                  <div className="space-y-3 mt-3">
                    <div className="bg-black/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-2 uppercase tracking-wide">
                        <Dumbbell className="w-3 h-3" /> Bài đã hoàn thành
                      </div>
                      
                      {item.exercisesSummary && (
                         <div className="mb-2 text-xs text-cyan-300/80 italic border-b border-white/5 pb-2">
                           {item.exercisesSummary}
                         </div>
                      )}

                      {item.completedExercises && item.completedExercises.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                          {item.completedExercises.map((ex, i) => (
                            <li key={i}>{ex}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-sm text-gray-500 italic">Không có bài nào được tích</span>
                      )}
                    </div>

                    {item.userNotes && (
                      <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-500/70 text-xs mb-1 uppercase tracking-wide">
                          <FileText className="w-3 h-3" /> Ghi chú
                        </div>
                        <p className="text-sm text-yellow-100/80 italic">"{item.userNotes}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
