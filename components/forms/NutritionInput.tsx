import React, { useState, useEffect } from 'react';
import { UserInput, FridgeItem } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Utensils, Refrigerator, Leaf, Plus, X, Loader2, Beef, Carrot, Egg, Droplets, Nut, Trash2 } from 'lucide-react';
import { fridgeService } from '../../services/fridgeService';
import { parseAndDeductFridge } from '../../services/geminiService';
import { canPerformOnlineAction } from '../../services/onlineGuard';

interface NutritionInputProps {
    userData: UserInput;
    setUserData: React.Dispatch<React.SetStateAction<UserInput>>;
    showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const NutritionInput: React.FC<NutritionInputProps> = ({ userData, setUserData, showToast }) => {
    const [newConsumedFood, setNewConsumedFood] = useState('');
    const [newDislikedFood, setNewDislikedFood] = useState('');
    
    // Fridge State
    const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
    const [newFridgeItem, setNewFridgeItem] = useState({ name: '', quantity: '', unit: 'g' });
    const [isUpdatingFridge, setIsUpdatingFridge] = useState(false);

    useEffect(() => {
        loadFridge();
    }, []);

    const loadFridge = async () => {
        const items = await fridgeService.getFridgeItems();
        setFridgeItems(items);
    };

    const handleAddFridgeItem = async () => {
        if (!newFridgeItem.name || !newFridgeItem.quantity) return;
        setIsUpdatingFridge(true);
        const added = await fridgeService.addFridgeItem({
            name: newFridgeItem.name,
            quantity: Number(newFridgeItem.quantity),
            unit: newFridgeItem.unit
        });
        if (added) {
            setFridgeItems(prev => [added, ...prev]);
            setNewFridgeItem({ name: '', quantity: '', unit: 'g' });
        }
        setIsUpdatingFridge(false);
    };

    const handleDeleteFridgeItem = async (id: string) => {
        setIsUpdatingFridge(true);
        const success = await fridgeService.deleteFridgeItem(id);
        if (success) {
            setFridgeItems(prev => prev.filter(item => item.id !== id));
        }
        setIsUpdatingFridge(false);
    };

    const processFridgeDeductions = async (mealName: string) => {
        if (fridgeItems.length === 0) return;
        const deductions = await parseAndDeductFridge(mealName, fridgeItems);
        
        let updatedItems = [...fridgeItems];
        for (const d of deductions) {
            const item = updatedItems.find(i => i.id === d.id);
            if (item) {
                const newQuantity = item.quantity - d.amount;
                if (newQuantity <= 0) {
                    await fridgeService.deleteFridgeItem(d.id);
                    updatedItems = updatedItems.filter(i => i.id !== d.id);
                } else {
                    await fridgeService.updateFridgeItem(d.id, { quantity: newQuantity });
                    item.quantity = newQuantity;
                }
            }
        }
        setFridgeItems(updatedItems);
    };

    // --- Handlers ---
    const handleAddConsumedFood = async () => {
        const foodName = newConsumedFood.trim();
        if (foodName) {
            if (!canPerformOnlineAction('nutrition-consumed-food-add', showToast)) return;

            setUserData(prev => ({
                ...prev,
                consumedFood: [...(prev.consumedFood || []), foodName]
            }));
            setNewConsumedFood('');
            
            // Deduct from fridge in background
            processFridgeDeductions(foodName);
        }
    };

    const handleRemoveConsumedFood = (indexToRemove: number) => {
        if (!canPerformOnlineAction('nutrition-consumed-food-remove', showToast)) return;

        setUserData(prev => ({
            ...prev,
            consumedFood: (prev.consumedFood || []).filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleAddDislikedFood = () => {
        const foodName = newDislikedFood.trim();
        if (!foodName) return;

        setUserData(prev => {
            const current = prev.dislikedFoods || [];
            const exists = current.some(item => item.toLowerCase() === foodName.toLowerCase());
            if (exists) return prev;

            return {
                ...prev,
                dislikedFoods: [...current, foodName]
            };
        });

        setNewDislikedFood('');
    };

    const handleRemoveDislikedFood = (indexToRemove: number) => {
        setUserData(prev => ({
            ...prev,
            dislikedFoods: (prev.dislikedFoods || []).filter((_, index) => index !== indexToRemove)
        }));
    };

    const getCategoryIcon = (category?: string) => {
        switch (category) {
            case 'protein': return <Beef className="text-red-400" />;
            case 'veg': return <Carrot className="text-emerald-400" />;
            case 'carb': return <Nut className="text-orange-400" />; // Fallback icon for rice/carb
            case 'fat': return <Droplets className="text-yellow-400" />;
            case 'spice': return <Leaf className="text-pink-400" />;
            default: return <Leaf className="text-gray-400" />;
        }
    };


    return (
        <div className="space-y-6 animate-fade-in pb-20">

            {/* 3. MEAL LOG (Bottom) */}
            < GlassCard id="tour-nutri-diary" title="Nhật ký ăn uống" icon={< Utensils className="w-6 h-6 text-amber-400" />}>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newConsumedFood}
                            onChange={(e) => setNewConsumedFood(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddConsumedFood()}
                            placeholder="Đã ăn gì? (VD: 1 bát phở bò...)"
                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                        <button
                            onClick={handleAddConsumedFood}
                            className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30 hover:bg-amber-500/30 transition-all active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {userData.consumedFood && userData.consumedFood.length > 0 ? (
                            userData.consumedFood.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors group">
                                    <span className="text-sm text-gray-300">{item}</span>
                                    <button
                                        onClick={() => handleRemoveConsumedFood(index)}
                                        className="text-gray-600 hover:text-red-400 transition-colors px-2"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-xs text-gray-600 py-2">Chưa ăn gì hôm nay.</p>
                        )}
                    </div>

                    <div className="border-t border-white/10 pt-3 space-y-2">
                        <p className="text-xs text-gray-400">Món không thích (AI sẽ không gợi ý)</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newDislikedFood}
                                onChange={(e) => setNewDislikedFood(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddDislikedFood()}
                                placeholder="VD: yến mạch, ca cao..."
                                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                            />
                            <button
                                onClick={handleAddDislikedFood}
                                className="p-2.5 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/30 hover:bg-rose-500/30 transition-all active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            {(userData.dislikedFoods || []).length > 0 ? (
                                (userData.dislikedFoods || []).map((item, index) => (
                                    <div key={`${item}-${index}`} className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                        <span className="text-sm text-rose-200">{item}</span>
                                        <button
                                            onClick={() => handleRemoveDislikedFood(index)}
                                            className="text-gray-600 hover:text-rose-300 transition-colors px-2"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-xs text-gray-600 py-1">Chưa có món cần tránh.</p>
                            )}
                        </div>
                    </div>
                </div>
            </GlassCard >

            {/* 4. FRIDGE (Bottom) */}
            <GlassCard id="tour-nutri-fridge" title="Tủ Lạnh" icon={<Refrigerator className="w-6 h-6 text-blue-400" />}>
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={newFridgeItem.name}
                            onChange={(e) => setNewFridgeItem({...newFridgeItem, name: e.target.value})}
                            placeholder="Tên nguyên liệu..."
                            className="flex-1 bg-black/20 text-white placeholder-gray-500 px-3 py-2.5 rounded-xl outline-none border border-white/10"
                        />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={newFridgeItem.quantity}
                                onChange={(e) => setNewFridgeItem({...newFridgeItem, quantity: e.target.value})}
                                placeholder="SL"
                                className="w-20 bg-black/20 text-white placeholder-gray-500 px-3 py-2.5 rounded-xl outline-none border border-white/10"
                            />
                            <select
                                value={newFridgeItem.unit}
                                onChange={(e) => setNewFridgeItem({...newFridgeItem, unit: e.target.value})}
                                className="w-20 bg-black/20 text-white px-2 py-2.5 rounded-xl outline-none border border-white/10"
                            >
                                <option value="g">Gam</option>
                                <option value="ml">Lít/ml</option>
                                <option value="qty">Số lượng</option>
                            </select>
                            <button
                                onClick={handleAddFridgeItem}
                                disabled={isUpdatingFridge || !newFridgeItem.name || !newFridgeItem.quantity}
                                className="px-4 py-2.5 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-all flex items-center justify-center"
                            >
                                {isUpdatingFridge ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Fridge List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {fridgeItems.length === 0 ? (
                            <p className="text-center text-gray-500 text-xs py-4">Tủ lạnh trống</p>
                        ) : (
                            fridgeItems.map((item) => (
                                <div key={item.id} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5 group">
                                    <span className="font-medium text-white text-sm">{item.name}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-blue-300 font-bold text-sm">
                                            {item.quantity}{item.unit === 'g' ? 'g' : item.unit === 'ml' ? 'ml' : ' (đơn vị)'}
                                        </span>
                                        <button 
                                            onClick={() => handleDeleteFridgeItem(item.id)}
                                            className="text-gray-600 hover:text-red-400 p-1 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </GlassCard>

        </div >
    );
};
