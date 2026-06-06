import {
    Staff,
    ShiftRequest,
    ShiftAssignment,
    PERIOD_MAPPING,
    REQUIRED_HEADCOUNT,
    AlgorithmPeriod,
    TimeSlotId,
    ShiftResult,
    DailyShiftResult,
    Shortage,
    hasCapability,
    Skill
} from './types';

export class ShiftGenerator {
    private staffList: Staff[];
    private requests: ShiftRequest[];
    private startDate: string;
    private endDate: string;
    private consecutiveWorkDays: Map<string, number>;
    private customHeadcounts?: Record<string, Record<AlgorithmPeriod, number>>;

    constructor(
        staffList: Staff[],
        requests: ShiftRequest[],
        startDate: string,
        endDate: string,
        customHeadcounts?: Record<string, Record<AlgorithmPeriod, number>>
    ) {
        this.staffList = staffList;
        this.requests = requests;
        this.startDate = startDate;
        this.endDate = endDate;
        this.customHeadcounts = customHeadcounts;
        this.consecutiveWorkDays = new Map();
        // Initialize consecutive days to 0 for all staff
        staffList.forEach(s => this.consecutiveWorkDays.set(s.id, 0));
    }

    public generate(): ShiftResult {
        const results: DailyShiftResult[] = [];
        const dates = this.getDatesInRange(this.startDate, this.endDate);
        let totalShortages = 0;

        for (const date of dates) {
            const dailyResult = this.generateForDate(date);
            results.push(dailyResult);
            totalShortages += dailyResult.shortages.reduce((sum, s) => sum + s.missing, 0);

            // Update consecutive work days
            this.updateConsecutiveDays(dailyResult.assignments);
        }

        return { results, totalShortages, allStaff: this.staffList };
    }

    private updateConsecutiveDays(assignments: ShiftAssignment[]) {
        const assignedStaffIds = new Set(assignments.map(a => a.staffId));

        this.staffList.forEach(staff => {
            if (assignedStaffIds.has(staff.id)) {
                const current = this.consecutiveWorkDays.get(staff.id) || 0;
                this.consecutiveWorkDays.set(staff.id, current + 1);
            } else {
                this.consecutiveWorkDays.set(staff.id, 0);
            }
        });
    }

    private generateForDate(date: string): DailyShiftResult {
        // 1. Get all requests for this date
        const dayRequests = this.requests.filter(r => r.date === date);

        // 2. Filter eligible staff (max 5 consecutive days)
        const eligibleRequests = dayRequests.filter(req => {
            const consecutive = this.consecutiveWorkDays.get(req.staffId) || 0;
            return consecutive < 5;
        });

        // 3. Find best combination
        // Since N is small, we can try a randomized approach to find the best subset
        // that satisfies constraints and maximizes score.

        const bestSolution = this.findBestCombination(eligibleRequests, date);

        // 4. Identify unassigned (backups)
        const assignedIds = new Set(bestSolution.assignments.map(a => a.staffId));
        const unassigned = dayRequests.filter(r => !assignedIds.has(r.staffId));

        return {
            date,
            assignments: bestSolution.assignments,
            unassigned,
            shortages: bestSolution.shortages
        };
    }

    private findBestCombination(requests: ShiftRequest[], date: string): { assignments: ShiftAssignment[], shortages: Shortage[] } {
        // Expand requests to include split options
        const expandedRequests: ShiftRequest[] = [];

        requests.forEach(req => {
            // Split options
            if (req.slotId === 'S-17') {
                // S-17 can be S-17, S-13, or 13-17
                expandedRequests.push(req); // S-17
                expandedRequests.push({ ...req, slotId: 'S-13' });
                expandedRequests.push({ ...req, slotId: '13-17' });
            } else if (req.slotId === '13-L') {
                // 13-L can be 13-L, 13-17, or 16-L
                expandedRequests.push(req); // 13-L
                expandedRequests.push({ ...req, slotId: '13-17' });
                expandedRequests.push({ ...req, slotId: '16-L' });
            } else if (req.slotId === 'S-L') {
                // Joker can be anything EXCEPT S-L itself (impossible to work open-close)
                expandedRequests.push({ ...req, slotId: 'S-13' });
                expandedRequests.push({ ...req, slotId: 'S-17' });
                expandedRequests.push({ ...req, slotId: '13-17' });
                expandedRequests.push({ ...req, slotId: '13-L' });
                expandedRequests.push({ ...req, slotId: '16-L' });
                expandedRequests.push({ ...req, slotId: '17-L' });
            } else {
                // Normal requests (S-13, 13-17, 16-L, 17-L)
                expandedRequests.push(req);
            }
        });

        // If no requests, return empty
        if (expandedRequests.length === 0) {
            return {
                assignments: [],
                shortages: this.calculateShortages([], date)
            };
        }

        let bestAssignments: ShiftAssignment[] = [];
        let bestScore = -Infinity;

        // Number of trials
        const TRIALS = 2000; // Increased trials due to expanded search space

        for (let i = 0; i < TRIALS; i++) {
            // For each staff, pick ONE option from their expanded requests (or none)
            const staffIds = Array.from(new Set(expandedRequests.map(r => r.staffId)));
            const assignments: ShiftAssignment[] = [];

            staffIds.forEach(sid => {
                // 80% chance to be assigned if available
                if (Math.random() > 0.2) {
                    const options = expandedRequests.filter(r => r.staffId === sid);
                    if (options.length > 0) {
                        const picked = options[Math.floor(Math.random() * options.length)];
                        assignments.push(this.toAssignment(picked));
                    }
                }
            });

            const shortages = this.calculateShortages(assignments, date);
            const shortageCount = shortages.reduce((sum, s) => sum + s.missing, 0);

            // We prefer solutions with 0 shortages, but if impossible, we take best score
            const score = this.calculateScore(assignments, shortages, date);

            if (score > bestScore) {
                bestScore = score;
                bestAssignments = assignments;
            }
        }

        return { assignments: bestAssignments, shortages: this.calculateShortages(bestAssignments, date) };
    }

    private toAssignment(req: ShiftRequest): ShiftAssignment {
        const staff = this.staffList.find(s => s.id === req.staffId);
        return {
            staffId: req.staffId,
            staffName: staff?.name,
            date: req.date,
            slotId: req.slotId
        };
    }

    private getRequiredHeadcount(date: string, period: AlgorithmPeriod): number {
        if (this.customHeadcounts && this.customHeadcounts[date] && this.customHeadcounts[date][period] !== undefined) {
            return this.customHeadcounts[date][period];
        }
        return REQUIRED_HEADCOUNT[period];
    }

    private calculateShortages(assignments: ShiftAssignment[], date: string): Shortage[] {
        const counts = {
            morning: 0,
            afternoon: 0,
            night: 0
        };

        assignments.forEach(a => {
            const periods = PERIOD_MAPPING[a.slotId];
            periods.forEach(p => counts[p]++);
        });

        const shortages: Shortage[] = [];
        (['morning', 'afternoon', 'night'] as AlgorithmPeriod[]).forEach(p => {
            const required = this.getRequiredHeadcount(date, p);
            const actual = counts[p];
            if (actual < required) {
                shortages.push({
                    date,
                    period: p,
                    required,
                    actual,
                    missing: required - actual
                });
            }
        });

        return shortages;
    }

    private calculateScore(assignments: ShiftAssignment[], shortages: Shortage[], date: string): number {
        let score = 0;

        // 1. Penalty for shortages (Heavy)
        const totalMissing = shortages.reduce((sum, s) => sum + s.missing, 0);
        score -= totalMissing * 10000;

        // 2. Skill Coverage Score
        // For each period, check if all 5 skills are covered
        const periodStaff = {
            morning: [] as Staff[],
            afternoon: [] as Staff[],
            night: [] as Staff[]
        };

        assignments.forEach(a => {
            const staff = this.staffList.find(s => s.id === a.staffId);
            if (staff) {
                const periods = PERIOD_MAPPING[a.slotId];
                periods.forEach(p => periodStaff[p].push(staff));
            }
        });

        const skills: Skill[] = ['3レジ', '4レジ', '1レジ', '2レジ', '日配'];

        (['morning', 'afternoon', 'night'] as AlgorithmPeriod[]).forEach(p => {
            const staffInPeriod = periodStaff[p];
            let coveredSkills = 0;

            skills.forEach(skill => {
                // Check if ANY staff in this period has this capability
                const isCovered = staffInPeriod.some(s => hasCapability(s.skills, skill));
                if (isCovered) coveredSkills++;
            });

            score += coveredSkills * 100; // +100 per covered skill type
        });

        // 3. Excess Penalty (Light)
        // We prefer exact numbers, but not at the cost of skills or shortages
        (['morning', 'afternoon', 'night'] as AlgorithmPeriod[]).forEach(p => {
            const required = this.getRequiredHeadcount(date, p);
            const actual = periodStaff[p].length;
            if (actual > required) {
                score -= (actual - required) * 10; // Small penalty for excess
            }
        });

        return score;
    }

    private getDatesInRange(start: string, end: string): string[] {
        const dates: string[] = [];
        let current = new Date(start);
        const last = new Date(end);

        while (current <= last) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    }
}
