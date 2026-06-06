import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Clock, Users, Settings } from 'lucide-react';
import { getCurrentShiftPeriod, getCurrentSubmissionPeriod } from '@/utils/date';
import ShiftScheduleTable from '@/components/ShiftScheduleTable';
import ShortageTable from '@/components/ShortageTable';
import { REQUIRED_HEADCOUNT, PERIOD_MAPPING, TimeSlotId, AlgorithmPeriod } from '@/utils/shift-algorithm/types';

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  // Fetch latest assignment date to determine display period
  const { data: latestAssignment } = await supabase
    .from('shift_assignments')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const latestDate = latestAssignment ? new Date(latestAssignment.date) : undefined;

  // Get current shift period (considering latest assignment)
  const { start, end } = getCurrentShiftPeriod(latestDate);

  // Helper to format date as YYYY-MM-DD in local time to avoid timezone shifts
  const toLocalISOString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Create Admin client to bypass RLS
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch assignments using Admin client to bypass RLS and see everyone's shifts
  const { data: assignmentsData } = await supabaseAdmin
    .from('shift_assignments')
    .select(`
      user_id,
      date,
      is_emergency,
      time_slots (
        name
      )
    `)
    .gte('date', toLocalISOString(start))
    .lte('date', toLocalISOString(end));

  // Fetch daily headcounts
  const { data: headcountsData } = await supabaseAdmin
    .from('daily_headcounts')
    .select('*')
    .gte('date', toLocalISOString(start))
    .lte('date', toLocalISOString(end));

  const dailyHeadcounts: Record<string, Record<AlgorithmPeriod, number>> = {};
  headcountsData?.forEach((h: any) => {
    dailyHeadcounts[h.date] = {
      morning: h.morning,
      afternoon: h.afternoon,
      night: h.night
    };
  });

  const { data: timeSlots } = await supabaseAdmin
    .from('time_slots')
    .select('name')
    .order('name');

  // Fetch staff with sorting by employee ID
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, employee_id')
    .eq('role', 'staff');

  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();

  // Map profiles
  const staffWithId = profiles?.map(p => {
    return {
      id: p.id,
      name: p.full_name || 'Unknown',
      employeeId: p.employee_id || ''
    };
  }) || [];

  // Sort by employee ID (8-digit string)
  staffWithId.sort((a, b) => {
    const aId = a.employeeId || ''
    const bId = b.employeeId || ''

    if (aId < bId) return -1
    if (aId > bId) return 1
    return 0
  });

  const staff = staffWithId.map(s => ({ id: s.id, name: s.name }));

  const assignments: Record<string, Record<string, { name: string, isEmergency: boolean }>> = {};
  assignmentsData?.forEach((a: any) => {
    if (!assignments[a.user_id]) assignments[a.user_id] = {};
    assignments[a.user_id][a.date] = {
      name: a.time_slots?.name || '',
      isEmergency: a.is_emergency || false
    };
  });

  // Generate dates array
  const dates: string[] = [];
  let d = new Date(start);
  while (d <= end) {
    dates.push(toLocalISOString(d));
    d.setDate(d.getDate() + 1);
  }

  // Calculate Shortages
  // 1. Initialize shortages map
  const shortages: Record<string, Record<string, { missing: number; candidates: string[]; emergencyStaff: string[] }>> = {};

  // 2. Calculate actual counts per day/period
  dates.forEach(date => {
    shortages[date] = {};

    const dayAssignments = assignmentsData?.filter((a: any) => a.date === date) || [];
    const counts = {
      morning: 0,
      afternoon: 0,
      night: 0
    };

    dayAssignments.forEach((a: any) => {
      // Filter out assignments for unknown staff (e.g. admins or deleted users)
      // This ensures they don't count towards the headcount, effectively invalidating them
      const isValidStaff = staff.some(s => s.id === a.user_id);
      if (!isValidStaff) return;

      const slotName = a.time_slots?.name as TimeSlotId;
      if (slotName && PERIOD_MAPPING[slotName]) {
        PERIOD_MAPPING[slotName].forEach(p => counts[p]++);
      }
    });

    // 3. Compare with required
    // Map algorithm periods to display periods (S-13, 13-17, 16-L)
    // S-13 -> morning
    // 13-17 -> afternoon
    // 16-L -> night (approx)

    const periodMap: Record<string, AlgorithmPeriod> = {
      'S-13': 'morning',
      '13-17': 'afternoon',
      '16-L': 'night'
    };

    Object.entries(periodMap).forEach(([displayPeriod, algoPeriod]) => {
      // Use custom headcount if available, otherwise default
      const required = dailyHeadcounts[date]?.[algoPeriod] ?? REQUIRED_HEADCOUNT[algoPeriod];
      const actual = counts[algoPeriod];
      const missing = Math.max(0, required - actual);

      // Find candidates (Staff who are NOT assigned on this day)
      const assignedStaffIds = new Set(dayAssignments.map((a: any) => a.user_id));
      const candidates = staff
        .filter(s => !assignedStaffIds.has(s.id))
        .map(s => s.name);

      // Find emergency staff for this period
      const emergencyStaff = dayAssignments
        .filter((a: any) => {
          const slotName = a.time_slots?.name as TimeSlotId;
          const isEmergency = a.is_emergency;
          // Check if this assignment contributes to the current period
          const contributes = slotName && PERIOD_MAPPING[slotName]?.includes(algoPeriod);
          return isEmergency && contributes;
        })
        .map((a: any) => {
          const s = staff.find(s => s.id === a.user_id);
          return s ? s.name : null;
        })
        .filter((name: string | null): name is string => name !== null);

      shortages[date][displayPeriod] = {
        missing,
        candidates: missing > 0 ? candidates : [],
        emergencyStaff
      };
    });
  });

  const timeSlotOptions = timeSlots?.map(ts => ts.name as TimeSlotId);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
              ダッシュボード
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              ようこそ、<span className="font-medium text-indigo-600">{profile?.full_name || user.email}</span> さん
            </p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs text-gray-400 font-medium tracking-wider uppercase">Current Period</p>
            <p className="text-sm font-semibold text-gray-700">
              {start.getMonth() + 1}/{start.getDate()} - {end.getMonth() + 1}/{end.getDate()}
            </p>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Staff Actions */}
        {!isAdmin && (
          <Link href="/shifts" className="block group h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full transition-all duration-200 hover:shadow-md hover:border-indigo-100 hover:-translate-y-1">
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <h4 className="ml-4 text-lg font-bold text-gray-900">シフト希望</h4>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                次回のシフト希望を提出したり、提出済みの内容を確認できます。
              </p>
              <div className="flex items-center text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
                提出・確認する <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
              </div>
            </div>
          </Link>
        )}

        {/* Admin Actions */}
        {isAdmin && (
          <>
            <Link href="/admin/submissions" className="block group h-full">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full transition-all duration-200 hover:shadow-md hover:border-indigo-100 hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <h4 className="ml-4 text-lg font-bold text-gray-900">提出状況</h4>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  スタッフのシフト提出状況を確認します。
                </p>
                <div className="flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                  確認する <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
                </div>
              </div>
            </Link>

            <Link href="/admin/shifts" className="block group h-full">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full transition-all duration-200 hover:shadow-md hover:border-indigo-100 hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-200">
                    <Settings className="h-6 w-6" />
                  </div>
                  <h4 className="ml-4 text-lg font-bold text-gray-900">シフト自動生成</h4>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  アルゴリズムを使用して最適なシフトを作成します。
                </p>
                <div className="flex items-center text-sm font-medium text-purple-600 group-hover:text-purple-700">
                  作成画面へ <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
                </div>
              </div>
            </Link>

            <Link href="/admin/staff" className="block group h-full">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full transition-all duration-200 hover:shadow-md hover:border-indigo-100 hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                    <Users className="h-6 w-6" />
                  </div>
                  <h4 className="ml-4 text-lg font-bold text-gray-900">スタッフ管理</h4>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  スタッフ情報の登録・編集・削除を行います。
                </p>
                <div className="flex items-center text-sm font-medium text-emerald-600 group-hover:text-emerald-700">
                  管理画面へ <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
                </div>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Shift Schedule Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
            確定シフト
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({start.getMonth() + 1}/{start.getDate()} 〜 {end.getMonth() + 1}/{end.getDate()})
            </span>
          </h2>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <ShiftScheduleTable
            dates={dates}
            staff={staff}
            assignments={assignments}
            editable={isAdmin}
            timeSlotOptions={timeSlotOptions && timeSlotOptions.length > 0 ? timeSlotOptions : undefined}
          />
        </div>

        <div className="mt-12">
          <div className="flex items-center justify-between px-1 mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
              人員不足状況
            </h2>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">
              要対応
            </span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <ShortageTable dates={dates} shortages={shortages} currentUserId={user.id} isAdmin={isAdmin} />
          </div>
        </div>
      </div>
    </div>
  );
}
