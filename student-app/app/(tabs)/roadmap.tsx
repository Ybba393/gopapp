import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';
import type { ProgramDay, Attendance } from '@/lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getDayStatus(dateStr: string): 'past' | 'today' | 'upcoming' {
  const today = new Date();
  const day = new Date(dateStr + 'T12:00:00');
  const todayStr = today.toISOString().split('T')[0];
  if (dateStr < todayStr) return 'past';
  if (dateStr === todayStr) return 'today';
  return 'upcoming';
}

function canCheckIn(dateStr: string): boolean {
  const now = new Date();
  const dayStr = now.toISOString().split('T')[0];
  if (dateStr !== dayStr) return false;
  return now.getHours() >= 9;
}

function canAccessExitTicket(dateStr: string): boolean {
  const now = new Date();
  const dayStr = now.toISOString().split('T')[0];
  if (dateStr !== dayStr) return false;
  return now.getHours() >= 15; // 3:00 PM
}

export default function RoadmapScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [programDays, setProgramDays] = useState<ProgramDay[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  async function loadData() {
    if (!profile?.cohort_id) return;

    const { data: days } = await supabase
      .from('program_days')
      .select('*')
      .eq('cohort_id', profile.cohort_id)
      .order('sort_order', { ascending: true });

    if (days) setProgramDays(days);

    const { data: att } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', profile.id);

    const map: Record<string, Attendance> = {};
    for (const a of att ?? []) {
      map[a.program_day_id] = a;
    }
    setAttendanceMap(map);
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [profile]);

  async function handleCheckIn(day: ProgramDay) {
    if (!profile) return;

    if (attendanceMap[day.id]) {
      Alert.alert('Already Checked In', 'You have already checked in for this program day.');
      return;
    }

    if (!canCheckIn(day.date)) {
      Alert.alert(
        'Check-in Not Available',
        'Check-in opens at 9:00 AM on the day of the program.'
      );
      return;
    }

    setCheckingIn(day.id);
    const { error } = await supabase.from('attendance').insert({
      student_id: profile.id,
      program_day_id: day.id,
      status: 'present',
    });
    setCheckingIn(null);

    if (error) {
      Alert.alert('Error', 'Could not check in. Please try again.');
      return;
    }

    setAttendanceMap((prev) => ({
      ...prev,
      [day.id]: {
        id: '',
        student_id: profile.id,
        program_day_id: day.id,
        status: 'present',
        checked_in_at: new Date().toISOString(),
      },
    }));

    Alert.alert('Checked In ✓', `Welcome to ${day.title}!`);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const STATUS_CONFIG = {
    past: { label: 'Completed', color: colors.success, bg: colors.successLight },
    today: { label: 'Today', color: colors.accent, bg: colors.accentLight },
    upcoming: { label: 'Upcoming', color: colors.primaryMid, bg: colors.primaryLight },
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerSmall}>
            {profile?.cohort?.name ?? 'Generation of Promise'}
          </Text>
          <Text style={styles.headerTitle}>Program Roadmap</Text>
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {programDays.map((day, index) => {
            const status = getDayStatus(day.date);
            const cfg = STATUS_CONFIG[status];
            const checkedIn = !!attendanceMap[day.id];
            const isCheckingInThis = checkingIn === day.id;
            const isToday = status === 'today';
            const isPast = status === 'past';

            return (
              <View key={day.id} style={styles.dayCard}>
                {/* Timeline connector */}
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      isPast && styles.timelineDotPast,
                      isToday && styles.timelineDotToday,
                    ]}
                  />
                  {index < programDays.length - 1 && <View style={styles.timelineLine} />}
                </View>

                {/* Card content */}
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Text style={styles.dateText}>{formatDate(day.date)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.dayTitle}>{day.title}</Text>
                  <Text style={styles.dayDesc}>{day.description}</Text>

                  <View style={styles.actionRow}>
                    {/* Check In button */}
                    {checkedIn ? (
                      <View style={styles.checkedInBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text style={styles.checkedInText}>Checked In</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          styles.checkInBtn,
                          (!isToday || isCheckingInThis) && styles.actionBtnDisabled,
                        ]}
                        onPress={() => handleCheckIn(day)}
                        disabled={isCheckingInThis}
                      >
                        {isCheckingInThis ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <Ionicons
                              name="log-in-outline"
                              size={14}
                              color={isToday ? colors.primary : colors.textMuted}
                            />
                            <Text
                              style={[
                                styles.actionBtnText,
                                !isToday && styles.actionBtnTextDisabled,
                              ]}
                            >
                              Check In
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Exit Ticket button */}
                    {day.has_exit_ticket && canAccessExitTicket(day.date) ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.exitTicketBtn]}
                        onPress={() => router.push('/exit-ticket/race-culture')}
                      >
                        <Ionicons name="document-text-outline" size={14} color={colors.primaryMid} />
                        <Text style={styles.exitTicketText}>Exit Ticket</Text>
                      </TouchableOpacity>
                    ) : day.has_exit_ticket && isToday ? (
                      <View style={[styles.actionBtn, styles.comingSoonBtn]}>
                        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.comingSoonText}>Opens at 3:00 PM</Text>
                      </View>
                    ) : day.has_exit_ticket && isPast ? (
                      <View style={[styles.actionBtn, styles.comingSoonBtn]}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.comingSoonText}>Closed</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
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
  },
  dayCard: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineLeft: {
    width: 28,
    alignItems: 'center',
    paddingTop: 14,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  timelineDotPast: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  timelineDotToday: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
    minHeight: 20,
  },
  cardContent: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginLeft: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  dayDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  checkInBtn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionBtnDisabled: {
    backgroundColor: colors.divider,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  actionBtnTextDisabled: {
    color: colors.textMuted,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
  },
  checkedInText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  exitTicketBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryMid,
  },
  exitTicketText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryMid,
  },
  comingSoonBtn: {
    backgroundColor: colors.divider,
    borderColor: colors.border,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
