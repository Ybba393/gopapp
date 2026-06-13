import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';
import type { VolunteerLog } from '@/lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function HoursScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [logs, setLogs] = useState<VolunteerLog[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [hoursStr, setHoursStr] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);

  async function loadLogs() {
    if (!profile) return;
    const { data } = await supabase
      .from('volunteer_logs')
      .select('*')
      .eq('student_id', profile.id)
      .order('date', { ascending: false });
    const all = data ?? [];
    setLogs(all);
    setTotalHours(all.reduce((sum, l) => sum + Number(l.hours), 0));
  }

  useEffect(() => {
    loadLogs().finally(() => setLoading(false));
  }, [profile]);

  async function onRefresh() {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  }

  function openModal() {
    setProjectName('');
    setHoursStr('');
    setDescription('');
    setDateStr(new Date().toISOString().split('T')[0]);
    setModalVisible(true);
  }

  async function handleSubmit() {
    if (!projectName.trim()) { Alert.alert('Error', 'Please enter a project name.'); return; }
    const hours = parseFloat(hoursStr);
    if (isNaN(hours) || hours <= 0) { Alert.alert('Error', 'Please enter valid hours (e.g. 2.5).'); return; }
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) { Alert.alert('Error', 'Date must be in YYYY-MM-DD format.'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('volunteer_logs').insert({
      student_id: profile!.id,
      project_name: projectName.trim(),
      hours,
      description: description.trim() || null,
      date: dateStr,
    });
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', 'Could not save your log. Please try again.');
      return;
    }

    setModalVisible(false);
    await loadLogs();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerSmall}>COMMUNITY SERVICE</Text>
          <Text style={styles.headerTitle}>Volunteer Hours</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openModal}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Total hours banner */}
      <View style={styles.totalBanner}>
        <View style={styles.totalLeft}>
          <Text style={styles.totalNumber}>{totalHours}</Text>
          <Text style={styles.totalUnit}>hours</Text>
        </View>
        <View style={styles.totalRight}>
          <Ionicons name="ribbon" size={40} color="rgba(212,168,83,0.3)" />
        </View>
        <Text style={styles.totalLabel}>Total Community Service Hours</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {logs.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="time-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No hours logged yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button above to log your first community service hours.
              </Text>
            </View>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHoursBadge}>
                  <Text style={styles.logHoursNumber}>{Number(log.hours)}</Text>
                  <Text style={styles.logHoursUnit}>hrs</Text>
                </View>
                <View style={styles.logInfo}>
                  <Text style={styles.logProject}>{log.project_name}</Text>
                  <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                  {log.description ? (
                    <Text style={styles.logDesc} numberOfLines={2}>
                      {log.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Log Hours Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Community Hours</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Project / Organization Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Detroit Food Bank"
                placeholderTextColor={colors.textMuted}
                value={projectName}
                onChangeText={setProjectName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Total Hours</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 2.5"
                placeholderTextColor={colors.textMuted}
                value={hoursStr}
                onChangeText={setHoursStr}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 2026-11-14"
                placeholderTextColor={colors.textMuted}
                value={dateStr}
                onChangeText={setDateStr}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Brief Description of Work</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder="What did you do? Who did you help?"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.submitBtnText}>Submit Log</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBanner: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  totalLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 4,
  },
  totalNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 60,
  },
  totalUnit: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  totalRight: {
    position: 'absolute',
    right: 24,
    bottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  logHoursBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  logHoursNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.accent,
    lineHeight: 22,
  },
  logHoursUnit: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
  },
  logInfo: {
    flex: 1,
    gap: 3,
  },
  logProject: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  logDate: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  logDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  // Modal
  modalRoot: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalForm: {
    padding: 20,
    gap: 18,
    paddingBottom: 40,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  formInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  formTextarea: {
    height: 100,
    paddingTop: 12,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
