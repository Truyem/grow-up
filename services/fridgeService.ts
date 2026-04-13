import { supabase } from './supabase';
import { FridgeItem } from '../types';

export const fridgeService = {
  async getFridgeItems(): Promise<FridgeItem[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
      .from('fridge_items')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fridge items:', error);
      return [];
    }
    return data || [];
  },

  async addFridgeItem(item: Omit<FridgeItem, 'id' | 'user_id' | 'created_at'>): Promise<FridgeItem | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from('fridge_items')
      .insert([{ ...item, user_id: userData.user.id }])
      .select()
      .single();

    if (error) {
      console.error('Error adding fridge item:', error);
      return null;
    }
    return data;
  },

  async updateFridgeItem(id: string, updates: Partial<FridgeItem>): Promise<FridgeItem | null> {
    const { data, error } = await supabase
      .from('fridge_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating fridge item:', error);
      return null;
    }
    return data;
  },

  async deleteFridgeItem(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('fridge_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting fridge item:', error);
      return false;
    }
    return true;
  }
};
