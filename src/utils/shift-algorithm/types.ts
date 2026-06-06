export type Skill = '3レジ' | '4レジ' | '1レジ' | '2レジ' | '日配';

export type TimeSlotId = 'S-13' | 'S-17' | '13-17' | '13-L' | '16-L' | '17-L' | 'S-L';

export type AlgorithmPeriod = 'morning' | 'afternoon' | 'night';

export interface Staff {
    id: string;
    name: string;
    skills: Skill[];
}

export interface ShiftRequest {
    staffId: string;
    staffName?: string; // Added for UI display
    date: string; // YYYY-MM-DD
    slotId: TimeSlotId;
}

export interface ShiftAssignment {
    staffId: string;
    staffName?: string; // Added for UI display
    date: string;
    slotId: TimeSlotId;
}

export interface Shortage {
    date: string;
    period: AlgorithmPeriod;
    required: number;
    actual: number;
    missing: number;
}

export interface DailyShiftResult {
    date: string;
    assignments: ShiftAssignment[];
    unassigned: ShiftRequest[]; // Backups
    shortages: Shortage[];
}

export interface ShiftResult {
    results: DailyShiftResult[];
    totalShortages: number;
    allStaff: Staff[]; // Added to support displaying all staff in the table
}

// Mapping from user-selectable slots to algorithm periods
export const PERIOD_MAPPING: Record<TimeSlotId, AlgorithmPeriod[]> = {
    'S-13': ['morning'],
    'S-17': ['morning', 'afternoon'],
    '13-17': ['afternoon'],
    '13-L': ['afternoon', 'night'],
    '16-L': ['night'],
    '17-L': ['night'],
    'S-L': ['morning', 'afternoon', 'night'],
};

// Base headcount requirements
export const REQUIRED_HEADCOUNT: Record<AlgorithmPeriod, number> = {
    'morning': 2,
    'afternoon': 2,
    'night': 5,
};

export type DailyHeadcount = Record<string, Record<AlgorithmPeriod, number>>;

// Skill hierarchy for reference (higher index = higher level/more capable)
// Assumption: Higher level implies capability of lower levels?
// User said: "2レジ or 日配 implies 3レジ, 4レジ, 1レジ are possible"
// Let's define a helper to check capability.
export const SKILL_HIERARCHY: Skill[] = ['3レジ', '4レジ', '1レジ', '2レジ', '日配'];

export function hasCapability(staffSkills: Skill[], requiredSkill: Skill): boolean {
    // If staff has the exact skill
    if (staffSkills.includes(requiredSkill)) return true;

    // If staff has '2レジ' or '日配', they can do '3レジ', '4レジ', '1レジ'
    const advancedSkills: Skill[] = ['2レジ', '日配'];
    const basicSkills: Skill[] = ['3レジ', '4レジ', '1レジ'];

    const hasAdvanced = staffSkills.some(s => advancedSkills.includes(s));
    if (hasAdvanced && basicSkills.includes(requiredSkill)) {
        return true;
    }

    return false;
}
