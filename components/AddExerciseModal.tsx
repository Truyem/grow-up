import React, { useState, useEffect } from 'react';
import { X, Plus, History, Dumbbell, Save, Sparkles, Loader2 } from 'lucide-react';
import { Exercise, ExerciseColor, WorkoutHistoryItem } from '../types';

interface AddExerciseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (exercise: Exercise) => void;
    history: WorkoutHistoryItem[];
    onSuggestAI: (callback: (ex: Exercise | null) => void) => void;
}

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({ isOpen, onClose, onAdd, history, onSuggestAI }) => {
    const [activeTab, setActiveTab] = useState<'new' | 'history' | 'ai'>('ai');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [sets, setSets] = useState(3);
    const [reps, setReps] = useState('10-12');
    const [weight, setWeight] = useState(''); // Optional, for notes
    const [notes, setNotes] = useState('');
    const [colorCode, setColorCode] = useState<ExerciseColor>('Blue');

    // Extract unique exercises from history
    const uniqueExercises = React.useMemo(() => {
        const map = new Map<string, Exercise>();
        history.forEach(item => {
            item.completedExercises.forEach(exName => {
                if (!map.has(exName)) {
                    map.set(exName, {
                        name: exName,
                        sets: 3,
                        reps: '10-12',
                        colorCode: 'Blue' // Default
                    });
                }
            });
        });
        return Array.from(map.values());
    }, [history]);

    const filteredExercises = uniqueExercises.filter(ex =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            // Reset form on open
            setName('');
            setSets(3);
            setReps('10-12');
            setWeight('');
            setNotes('');
            setColorCode('Blue');
            setActiveTab('ai'); // Default to AI
            setIsAiLoading(false);
            setAiError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const newExercise: Exercise = {
            name: name,
            sets: Number(sets),
            reps: reps,
            notes: weight ? `${weight} - ${notes}` : notes,
            colorCode: colorCode,
            primaryMuscleGroups: [],
            secondaryMuscleGroups: []
        };

        onAdd(newExercise);
        onClose();
    };

    const handleSelectHistory = (ex: Exercise) => {
        setName(ex.name);
        setActiveTab('new'); // Switch to new tab to edit details
    };

    const handleAiSuggestClick = () => {
        setIsAiLoading(true);
        setAiError(null);
        onSuggestAI((suggestedEx) => {
            setIsAiLoading(false);
            if (suggestedEx) {
                // Pre-fill form with AI suggestion and switch to 'new' tab to allow editing
                setName(suggestedEx.name);
                setSets(suggestedEx.sets);
                setReps(suggestedEx.reps);
                setNotes(suggestedEx.notes || '');
                if (suggestedEx.colorCode) setColorCode(suggestedEx.colorCode);
                setActiveTab('new');
            } else {
                setAiError("Không thể tạo bài tập lúc này. Hãy thử lại.");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#1a1b26] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-cyan-400" />
                        Thêm Bài Tập
                    </h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-2 bg-black/20 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'ai' ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30' : 'text-gray-500 hover:bg-white/5'}`}
                    >
                        <Sparkles className="w-4 h-4" /> AI Gợi Ý
                    </button>
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'new' ? 'bg-white/10 text-white' : 'text-gray-500 hover:bg-white/5'}`}
                    >
                        <Dumbbell className="w-4 h-4" /> Tự Nhập
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-500 hover:bg-white/5'}`}
                    >
                        <History className="w-4 h-4" /> Bài Đã Tập ({uniqueExercises.length})
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {activeTab === 'ai' ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="p-4 bg-cyan-500/10 rounded-full inline-block mb-2">
                                <Sparkles className="w-8 h-8 text-cyan-300" />
                            </div>
                            <h4 className="text-lg font-bold text-white">AI Suggestion</h4>
                            <p className="text-sm text-gray-400 max-w-xs mx-auto">
                                AI sẽ phân tích lịch tập hôm nay và đề xuất 1 bài tập phù hợp nhất để bổ sung.
                            </p>

                            {aiError && (
                                <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded-lg">{aiError}</p>
                            )}

                            <button
                                onClick={handleAiSuggestClick}
                                disabled={isAiLoading}
                                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isAiLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Đang suy nghĩ...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Yêu Cầu Bài Tập Mới
                                    </>
                                )}
                            </button>
                        </div>
                    ) : activeTab === 'new' ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Tên bài tập</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ví dụ: Bench Press"
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500/50"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Số Hiệp (Sets)</label>
                                    <input
                                        type="number"
                                        value={sets}
                                        onChange={(e) => setSets(Number(e.target.value))}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500/50"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Số Reps</label>
                                    <input
                                        type="text"
                                        value={reps}
                                        onChange={(e) => setReps(e.target.value)}
                                        placeholder="10-12"
                                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Nhóm cơ (Màu sắc)</label>
                                <select
                                    value={colorCode}
                                    onChange={(e) => setColorCode(e.target.value as ExerciseColor)}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500/50 appearance-none"
                                >
                                    <option value="Red">Vai (Đỏ)</option>
                                    <option value="Blue">Ngực (Xanh Dương)</option>
                                    <option value="Yellow">Lưng (Vàng)</option>
                                    <option value="Green">Tay sau (Xanh Lá)</option>
                                    <option value="Pink">Tay trước (Hồng)</option>
                                    <option value="Purple">Chân (Tím)</option>
                                    <option value="Orange">Bụng/Tim mạch (Cam)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Mức tạ / Ghi chú</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Ví dụ: 20kg, tập chậm..."
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500/50"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 mt-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                Lưu Bài Tập
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Tìm bài tập cũ..."
                                className="w-full bg-black/30 border border-white/10 rounded-xl p-2 text-sm text-white mb-3"
                            />

                            {filteredExercises.length > 0 ? (
                                filteredExercises.map((ex, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectHistory(ex)}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors flex justify-between items-center group"
                                    >
                                        <span className="font-medium text-gray-300 group-hover:text-white">{ex.name}</span>
                                        <Plus className="w-4 h-4 text-gray-500 group-hover:text-cyan-400" />
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 text-sm py-4">Không tìm thấy bài tập nào.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
