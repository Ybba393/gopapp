import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';
import type { CapstoneGroup, VolunteerLog, Attendance, Profile } from '@/lib/types';

const MISSION =
  'To build a community of young leaders who celebrate diversity and are dedicated to the elimination of discrimination in metropolitan Detroit. Our efforts are guided by the belief that building relationships among youth of many cultures and ethnicities results in stronger relationships, an appreciation of individual differences, and creates a valuable corps of future leaders.';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [volunteerHours, setVolunteerHours] = useState(0);
  const [programDaysAttended, setProgramDaysAttended] = useState(0);
  const [totalProgramDays, setTotalProgramDays] = useState(7);
  const [group, setGroup] = useState<CapstoneGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    if (!profile) return;

    // Volunteer hours
    const { data: logs } = await supabase
      .from('volunteer_logs')
      .select('hours')
      .eq('student_id', profile.id);

    const total = (logs ?? []).reduce((sum: number, l: Pick<VolunteerLog, 'hours'>) => sum + Number(l.hours), 0);
    setVolunteerHours(total);

    // Attendance
    const { data: attendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', profile.id)
      .eq('status', 'present');
    setProgramDaysAttended((attendance ?? []).length);

    // Capstone group
    const { data: memberRow } = await supabase
      .from('group_members')
      .select('group_id, group:capstone_groups(*)')
      .eq('student_id', profile.id)
      .single();

    if (memberRow?.group) {
      const g = memberRow.group as unknown as CapstoneGroup;
      setGroup(g);

      // Fetch members of that group
      const { data: members } = await supabase
        .from('group_members')
        .select('profile:profiles(id, name, email)')
        .eq('group_id', g.id);

      const profiles = (members ?? []).map((m: any) => m.profile as Profile).filter(Boolean);
      setGroupMembers(profiles);
    } else {
      setGroup(null);
      setGroupMembers([]);
    }

    // Total program days for cohort
    if (profile.cohort_id) {
      const { count } = await supabase
        .from('program_days')
        .select('id', { count: 'exact', head: true })
        .eq('cohort_id', profile.cohort_id);
      if (count != null) setTotalProgramDays(count);
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [profile]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const firstName = profile?.name?.split(' ')[0] ?? 'Student';
  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerSmall}>
            {profile?.cohort?.name ?? 'Generation of Promise'}
          </Text>
          <Text style={styles.headerGreeting}>Welcome back, {firstName} 👋</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard
              icon="time-outline"
              label="Volunteer Hours"
              value={`${volunteerHours}h`}
              color={colors.accent}
              bgColor={colors.accentLight}
            />
            <StatCard
              icon="calendar-outline"
              label="Days Attended"
              value={`${programDaysAttended}/${totalProgramDays}`}
              color={colors.primaryMid}
              bgColor={colors.primaryLight}
            />
          </View>

          {/* Capstone group card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>Capstone Group</Text>
            </View>

            {group ? (
              <>
                <Text style={styles.groupName}>{group.name}</Text>
                <View style={styles.membersList}>
                  {groupMembers.map((member, i) => (
                    <View key={member.id} style={styles.memberRow}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {member.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </Text>
                      </View>
                      <Text style={styles.memberName}>
                        {member.name}
                        {member.id === profile?.id ? '  (you)' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyGroup}>
                <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyGroupText}>
                  You haven't been assigned to a group yet.
                </Text>
                <Text style={styles.emptyGroupSub}>Mrs. Sykes will assign groups soon.</Text>
              </View>
            )}
          </View>

          {/* Quick links */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={styles.quickLinks}>
              <QuickLink icon="time-outline" label="Log Hours" route="/(tabs)/hours" />
              <QuickLink icon="calendar-outline" label="Program Days" route="/(tabs)/roadmap" />
            </View>
          </View>

          {/* Mission statement */}
          <View style={styles.missionCard}>
            <Text style={styles.missionLabel}>OUR MISSION</Text>
            <Text style={styles.missionText}>{MISSION}</Text>
            <Text style={styles.missionSource}>— Generation of Promise</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={[styles.statCard, { flex: 1 }]}>
      <View style={[styles.statIconWrap, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickLink({
  icon,
  label,
  route,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}) {
  const { router } = require('expo-router');
  return (
    <TouchableOpacity style={styles.quickLink} onPress={() => router.push(route)}>
      <View style={styles.quickLinkIcon}>
        <Ionicons name={icon} size={18} color={colors.primaryMid} />
      </View>
      <Text style={styles.quickLinkLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerSmall: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerGreeting: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 14,
  },
  membersList: {
    gap: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryMid,
  },
  memberName: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  emptyGroup: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyGroupText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyGroupSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  quickLinks: {
    gap: 2,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  quickLinkIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  missionCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  missionLabel: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  missionText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  missionSource: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
});
