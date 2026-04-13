/**
 * bodyMetrics.ts
 * Tính toán các chỉ số cơ thể: BMI, BMR, TDEE
 * Công thức: Mifflin-St Jeor (chuẩn nhất hiện tại)
 */

import { Intensity } from '../types';

export type Gender = 'male' | 'female';

export interface BodyMetrics {
    bmi: number;
    bmiCategory: string;
    bmiColor: string;
    bmr: number;
    tdee: number;
    tdeeDescription: string;
    recommendedCalories: number; // dựa theo goal (bulking/cutting)
    recommendedProtein: number;  // g/kg * weight
    hydrationGoal: number;       // ml/day
}

/**
 * BMI = weight(kg) / (height(m))^2
 */
export function calculateBMI(weight: number, height: number): { value: number; category: string; color: string } {
    if (!weight || !height || height < 50) return { value: 0, category: 'Chưa đủ dữ liệu', color: '#6b7280' };

    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    const value = Math.round(bmi * 10) / 10;

    let category: string;
    let color: string;

    if (bmi < 16) { category = 'Thiếu cân nặng (III)'; color = '#ef4444'; }
    else if (bmi < 17) { category = 'Thiếu cân nặng (II)'; color = '#f97316'; }
    else if (bmi < 18.5) { category = 'Thiếu cân nhẹ'; color = '#eab308'; }
    else if (bmi < 23) { category = 'Bình thường'; color = '#22c55e'; }
    else if (bmi < 25) { category = 'Thừa cân'; color = '#eab308'; }
    else if (bmi < 30) { category = 'Béo phì (I)'; color = '#f97316'; }
    else { category = 'Béo phì (II+)'; color = '#ef4444'; }

    return { value, category, color };
}

/**
 * BMR - Mifflin-St Jeor Equation
 * Male:   BMR = 10×weight + 6.25×height − 5×age + 5
 * Female: BMR = 10×weight + 6.25×height − 5×age − 161
 */
export function calculateBMR(weight: number, height: number, age: number, gender: Gender = 'male'): number {
    if (!weight || !height || !age) return 0;
    const base = 10 * weight + 6.25 * height - 5 * age;
    const bmr = gender === 'male' ? base + 5 : base - 161;
    return Math.round(bmr);
}

/**
 * TDEE = BMR × Activity Multiplier
 * Based on Intensity level
 */
export function calculateTDEE(bmr: number, intensity: Intensity): { tdee: number; description: string } {
    let multiplier: number;
    let description: string;

    switch (intensity) {
        case Intensity.Low:
            multiplier = 1.375; // lightly active
            description = 'Tập nhẹ 1-3 ngày/tuần';
            break;
        case Intensity.Medium:
            multiplier = 1.55; // moderately active
            description = 'Tập vừa 3-5 ngày/tuần';
            break;
        case Intensity.Hard:
            multiplier = 1.725; // very active
            description = 'Tập nặng 6-7 ngày/tuần';
            break;
        default:
            multiplier = 1.55;
            description = 'Tập vừa 3-5 ngày/tuần';
    }

    return { tdee: Math.round(bmr * multiplier), description };
}

/**
 * Tính toán tất cả chỉ số một lần
 */
export function computeBodyMetrics(
    weight: number,
    height: number,
    age: number,
    intensity: Intensity,
    nutritionGoal: 'bulking' | 'cutting',
    gender: Gender = 'male'
): BodyMetrics {
    const bmiResult = calculateBMI(weight, height);
    const bmr = calculateBMR(weight, height, age, gender);
    const { tdee, description: tdeeDescription } = calculateTDEE(bmr, intensity);

    // Recommended calories based on goal
    let recommendedCalories: number;
    if (nutritionGoal === 'bulking') {
        recommendedCalories = Math.round(tdee * 1.1); // +10% surplus
    } else {
        recommendedCalories = Math.round(tdee * 0.85); // -15% deficit
    }

    // Protein: 1.8g/kg for bulking, 2.2g/kg for cutting (preserve muscle)
    const proteinMultiplier = nutritionGoal === 'bulking' ? 1.8 : 2.2;
    const recommendedProtein = Math.round(weight * proteinMultiplier);

    // Hydration: 35ml/kg + 500ml if intense, minimum 2000ml
    const baseHydration = Math.round(weight * 35);
    const intensityBonus = intensity === Intensity.Hard ? 700 : intensity === Intensity.Medium ? 500 : 300;
    const hydrationGoal = Math.max(2000, baseHydration + intensityBonus);

    return {
        bmi: bmiResult.value,
        bmiCategory: bmiResult.category,
        bmiColor: bmiResult.color,
        bmr,
        tdee,
        tdeeDescription,
        recommendedCalories,
        recommendedProtein,
        hydrationGoal,
    };
}

/**
 * Format số với dấu phân cách nghìn
 */
export function formatNumber(n: number): string {
    return n.toLocaleString('vi-VN');
}
