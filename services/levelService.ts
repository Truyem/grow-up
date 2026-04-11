import { UserLevel } from '../types';
import { supabase } from './supabase';

/**
 * Tạo hoặc lấy user level từ Supabase
 */
export async function initializeUserLevel(userId: string): Promise<UserLevel | null> {
  if (!userId) return null;

  try {
    // Lấy existing level
    const { data, error } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      console.error('Error fetching user level:', error);
      return null;
    }

    if (data) {
      return {
        userId,
        currentLevel: data.current_level || 0,
        currentRankNumber: data.current_rank_number || 1,
        previousRankNumber: data.previous_rank_number || 1,
        totalXP: data.total_xp || 0,
        currentLevelXP: data.current_level_xp || 0,
        nextLevelXP: data.next_level_xp || 1100,
        lifetimeXP: data.lifetime_xp || 0,
        lastLevelUpDate: data.last_level_up_date,
      };
    }

    // Tạo new user level nếu không tồn tại
    const newLevel: UserLevel = {
      userId,
      currentLevel: 0,
      currentRankNumber: 1,
      previousRankNumber: 1,
      totalXP: 0,
      currentLevelXP: 0,
      nextLevelXP: 1100,
      lifetimeXP: 0,
    };

    const { error: insertError } = await supabase.from('user_levels').insert({
      user_id: userId,
      current_level: newLevel.currentLevel,
      current_rank_number: newLevel.currentRankNumber,
      previous_rank_number: newLevel.previousRankNumber,
      total_xp: newLevel.totalXP,
      current_level_xp: newLevel.currentLevelXP,
      next_level_xp: newLevel.nextLevelXP,
      lifetime_xp: newLevel.lifetimeXP,
    });

    if (insertError) {
      console.error('Error creating user level:', insertError);
      return null;
    }

    return newLevel;
  } catch (error) {
    console.error('Error in initializeUserLevel:', error);
    return null;
  }
}

/**
 * Lưu user level lên Supabase
 */
export async function saveUserLevel(userId: string, level: UserLevel): Promise<boolean> {
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('user_levels')
      .update({
        current_level: level.currentLevel,
        current_rank_number: level.currentRankNumber,
        previous_rank_number: level.previousRankNumber,
        total_xp: level.totalXP,
        current_level_xp: level.currentLevelXP,
        next_level_xp: level.nextLevelXP,
        lifetime_xp: level.lifetimeXP,
        last_level_up_date: level.lastLevelUpDate || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error saving user level:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveUserLevel:', error);
    return false;
  }
}

/**
 * Thêm XP cho user
 */
export async function addXPToUser(
  userId: string,
  xpAmount: number,
  currentLevel: UserLevel
): Promise<UserLevel | null> {
  if (!userId || xpAmount <= 0) return null;

  try {
    // Cập nhật XP
    let updatedLevel = { ...currentLevel };
    updatedLevel.currentLevelXP += xpAmount;
    updatedLevel.totalXP += xpAmount;
    updatedLevel.lifetimeXP += xpAmount;

    // Kiểm tra level up
    while (updatedLevel.currentLevelXP >= updatedLevel.nextLevelXP) {
      updatedLevel.currentLevelXP -= updatedLevel.nextLevelXP;
      updatedLevel.currentLevel += 1;
      updatedLevel.nextLevelXP = (updatedLevel.currentLevel + 1) * 1100;
      updatedLevel.lastLevelUpDate = new Date().toISOString();
    }

    // Lưu lên Supabase
    const saved = await saveUserLevel(userId, updatedLevel);
    return saved ? updatedLevel : null;
  } catch (error) {
    console.error('Error in addXPToUser:', error);
    return null;
  }
}

/**
 * Lấy user level từ Supabase
 */
export async function getUserLevel(userId: string): Promise<UserLevel | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user level:', error);
      return null;
    }

    if (data) {
      return {
        userId,
        currentLevel: data.current_level || 0,
        totalXP: data.total_xp || 0,
        currentLevelXP: data.current_level_xp || 0,
        nextLevelXP: data.next_level_xp || 1100,
        lifetimeXP: data.lifetime_xp || 0,
        lastLevelUpDate: data.last_level_up_date,
      };
    }

    return null;
  } catch (error) {
    console.error('Error in getUserLevel:', error);
    return null;
  }
}
