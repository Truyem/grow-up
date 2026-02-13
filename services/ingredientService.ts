import { supabase } from './supabase';
import { Ingredient } from '../types';

export const getIngredients = async (userId: string): Promise<Ingredient[]> => {
    const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching ingredients:', error);
        return [];
    }

    // Map Supabase data to Ingredient type
    return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity), // Ensure number
        unit: item.unit,
        category: item.category,
        expiryDate: item.expiry_date,
        notes: item.notes,
        caloriesPer100g: item.calories_per_100g // Ensure this column exists or map correctly if I missed it in SQL
    }));
};

export const addIngredient = async (userId: string, ingredient: Omit<Ingredient, 'id'>) => {
    const { data, error } = await supabase
        .from('ingredients')
        .insert({
            user_id: userId,
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: ingredient.category,
            expiry_date: ingredient.expiryDate,
            // notes: ingredient.notes, // Add to type if needed
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding ingredient:', error);
        throw error;
    }
    return data;
};

export const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    const { data, error } = await supabase
        .from('ingredients')
        .update({
            name: updates.name,
            quantity: updates.quantity,
            unit: updates.unit,
            category: updates.category,
            expiry_date: updates.expiryDate,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating ingredient:', error);
        throw error;
    }
    return data;
};

export const deleteIngredient = async (id: string) => {
    const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting ingredient:', error);
        throw error;
    }
};
