import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';
import type { ExitTicketResponse, RaceCultureExitTicket } from '@/lib/types';

const ENJOYED_OPTIONS = [
  'Jubilee Dialogues',
  'Artifacts of Us',
  'Brave Circles',
  'Transform the Space Activity',
  'Capstone Engagement',
];

const UNDERSTANDING_OPTIONS: Array<{ value: RaceCultureExitTicket['better_understanding']; label: string }> = [
  { value: 'yes', label: 'Yes, definitely' },
  { value: 'somewhat', label: 'Somewhat' },
  { value: 'not_yet', label: 'Not yet' },
];

const CRITICAL_ISSUES = [
  'Accessibility / Disability Justice',
  'LGBTQ+',
  'Mass Incarceration / Reform',
  'Food Insecurity',
  'Education Reform',
  'Sex Ed',
  'Religion / Faith',
  'Environmental Justice',
  'Health and Wellness',
  'Politics / Advocacy',
  'Financial Security',
  'Social Media / AI',
  'Family / Relationships',
  'Gun Control',
  'Immigration',
  'Youth Leadership',
];

const MAX_CRITICAL = 5;

type RatingValue = 1 | 2 | 3 | 4 | 5;
const RATING_LABELS: Record<RatingValue, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: RatingValue) => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.starRow}>
      {([1, 2, 3, 4, 5] as RatingValue[]).map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !disabled && onChange(star)}
          style={styles.starBtn}
          disabled={disabled}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={28}
            color={star <= value ? colors.accent : colors.border}
          />
        </TouchableOpacity>
      ))}
      {value > 0 && (
        <Text style={styles.ratingLabel}>{RATING_LABELS[value as RatingValue]}</Text>
      )}
    </View>
  );
}

function Checkbox({
  checked,
  onToggle,
  label,
  disabled,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.checkboxRow}
      onPress={() => !disabled && onToggle()}
      disabled={disabled}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function RaceCultureExitTicketScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [programDayId, setProgramDayId] = useState<string | null>(null);
  const [existingResponse, setExistingResponse] = useState<ExitTicketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [breakfastRating, setBreakfastRating] = useState(0);
  const [lunchRating, setLunchRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [enjoyedAspects, setEnjoyedAspects] = useState<string[]>([]);
  const [betterUnderstanding, setBetterUnderstanding] = useState<
    RaceCultureExitTicket['better_understanding'] | ''
  >('');
  const [majorTakeaways, setMajorTakeaways] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');
  const [criticalIssues, setCriticalIssues] = useState<string[]>([]);

  const isLocked = !!existingResponse;

  useEffect(() => {
    async function load() {
      if (!profile?.cohort_id) return;

      // Find Race & Culture Day for this cohort
      const { data: dayData } = await supabase
        .from('program_days')
        .select('id')
        .eq('cohort_id', profile.cohort_id)
        .eq('has_exit_ticket', true)
        .single();

      if (!dayData) { setLoading(false); return; }
      setProgramDayId(dayData.id);

      // Check for existing submission
      const { data: existing } = await supabase
        .from('exit_ticket_responses')
        .select('*')
        .eq('student_id', profile.id)
        .eq('program_day_id', dayData.id)
        .single();

      if (existing) {
        setExistingResponse(existing as ExitTicketResponse);
        const r = existing.responses as RaceCultureExitTicket;
        setBreakfastRating(r.breakfast_rating ?? 0);
        setLunchRating(r.lunch_rating ?? 0);
        setOverallRating(r.overall_rating ?? 0);
        setEnjoyedAspects(r.enjoyed_aspects ?? []);
        setBetterUnderstanding(r.better_understanding ?? '');
        setMajorTakeaways(r.major_takeaways ?? '');
        setAdditionalComments(r.additional_comments ?? '');
        setCriticalIssues(r.critical_issues ?? []);
      }

      setLoading(false);
    }
    load();
  }, [profile]);

  function toggleEnjoyed(item: string) {
    setEnjoyedAspects((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  function toggleIssue(item: string) {
    setCriticalIssues((prev) => {
      if (prev.includes(item)) return prev.filter((x) => x !== item);
      if (prev.length >= MAX_CRITICAL) {
        Alert.alert('Limit Reached', `You can select up to ${MAX_CRITICAL} critical issues.`);
        return prev;
      }
      return [...prev, item];
    });
  }

  async function handleSubmit() {
    if (breakfastRating === 0) { Alert.alert('Required', 'Please rate today\'s breakfast.'); return; }
    if (lunchRating === 0) { Alert.alert('Required', 'Please rate today\'s lunch.'); return; }
    if (overallRating === 0) { Alert.alert('Required', 'Please rate the program day overall.'); return; }
    if (!betterUnderstanding) { Alert.alert('Required', 'Please answer question 5.'); return; }
    if (!majorTakeaways.trim()) { Alert.alert('Required', 'Please share your major takeaways.'); return; }
    if (criticalIssues.length === 0) { Alert.alert('Required', 'Please select at least one critical issue.'); return; }

    const responses: RaceCultureExitTicket = {
      breakfast_rating: breakfastRating,
      lunch_rating: lunchRating,
      overall_rating: overallRating,
      enjoyed_aspects: enjoyedAspects,
      better_understanding: betterUnderstanding as RaceCultureExitTicket['better_understanding'],
      major_takeaways: majorTakeaways.trim(),
      additional_comments: additionalComments.trim(),
      critical_issues: criticalIssues,
    };

    setSubmitting(true);
    const { error } = await supabase.from('exit_ticket_responses').insert({
      student_id: profile!.id,
      program_day_id: programDayId!,
      responses,
    });
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', 'Could not submit your response. Please try again.');
      return;
    }

    Alert.alert(
      'Submitted! 🎉',
      'Your exit ticket has been submitted. You can come back to review your answers anytime.',
      [{ text: 'Done', onPress: () => router.back() }]
    );
  }

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.accent} />
          <Text style={styles.backText}>Back to Roadmap</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Race and Culture Day</Text>
          <Text style={styles.pageSubtitle}>Exit Ticket</Text>
          {isLocked && (
            <View style={styles.lockedBanner}>
              <Ionicons name="lock-closed" size={14} color={colors.primaryMid} />
              <Text style={styles.lockedText}>
                Submitted on {new Date(existingResponse!.submitted_at).toLocaleDateString()}. Answers are view-only.
              </Text>
            </View>
          )}

          {/* Q1 */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionNum}>1.</Text>
            <Text style={styles.questionText}>How would you rate today's breakfast?</Text>
            <StarRating
              value={breakfastRating}
              onChange={setBreakfastRating}
              disabled={isLocked}
            />
          </View>

          {/* Q2 */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionNum}>2.</Text>
            <Text style={styles.questionText}>How would you rate today's lunch?</Text>
            <StarRating value={lunchRating} onChange={setLunchRating} disabled={isLocked} />
          </View>

          {/* Q3 */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionNum}>3.</Text>
            <Text style={styles.questionText}>How would you rate the program day overall?</Text>
            <StarRating value={overallRating} onChange={setOverallRating} disabled={isLocked} />
          </View>

          {/* Q4 */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionNum}>4.</Text>
            <Text style={styles.questionText}>
              During today's program day, what aspects did you enjoy the most?
            </Text>
            <Text style={styles.selectAll}>Select all that apply</Text>
            {ENJOYED_OPTIONS.map((item) => (
              <Checkbox
                key={item}
                checked={enjoyedAspects.includes(item)}
                onToggle={() => toggleEnjoyed(item)}
                label={item}
                disabled={isLocked}
              />
            ))}
          </View>

          {/* Q5 */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionNum}>5.</Text>
            <Text style={styles.questionText}>
              Do you feel like you have a better understanding of how identity, culture, and power
              shape your lived experiences and relationships with others?
            </Text>
            <View style={styles.optionGroup}>
              {UNDERSTANDING_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionBtn,
                    betterUnderstanding === opt.value && styles.optionBtnSelected,
                  ]}
                  onPress={() => !isLocked && setBetterUnderstanding(opt.value)}
                  disabled={isLocked}
                >
                  <Text
                    style={[
                      styles.optionText,
                      betterUnderstanding === opt.value && styles.optionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Q6 */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionNum}>6.</Text>
            <Text style={styles.questionText}>What were your major takeaways from today?</Text>
            <TextInput
              style={[styles.textArea, isLocked && styles.textAreaLocked]}
              placeholder="Share your thoughts here..."
              placeholderTextColor={colors.textMuted}
              value={majorTakeaways}
              onChangeText={setMajorTakeaways}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isLocked}
            />
          </View>

          {/* Q7 */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionNum}>7.</Text>
            <Text style={styles.questionText}>
              Any additional comments or feedback? Please share here.
            </Text>
            <TextInput
              style={[styles.textArea, isLocked && styles.textAreaLocked]}
              placeholder="Optional..."
              placeholderTextColor={colors.textMuted}
              value={additionalComments}
              onChangeText={setAdditionalComments}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isLocked}
            />
          </View>

          {/* Q8 */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionNum}>8.</Text>
            <Text style={styles.questionText}>
              Choose your top {MAX_CRITICAL} critical issues — what matters most to you?
            </Text>
            <Text style={styles.selectAll}>Select up to {MAX_CRITICAL}</Text>
            <View style={styles.issuesGrid}>
              {CRITICAL_ISSUES.map((issue) => {
                const checked = criticalIssues.includes(issue);
                return (
                  <TouchableOpacity
                    key={issue}
                    style={[styles.issueChip, checked && styles.issueChipSelected]}
                    onPress={() => toggleIssue(issue)}
                    disabled={isLocked}
                  >
                    <Text style={[styles.issueText, checked && styles.issueTextSelected]}>
                      {issue}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {!isLocked && (
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.submitBtnText}>Submit Exit Ticket</Text>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  lockedText: {
    fontSize: 13,
    color: colors.primaryMid,
    flex: 1,
  },
  questionBlock: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  questionNum: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 4,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 14,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starBtn: {
    padding: 2,
  },
  ratingLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 8,
  },
  selectAll: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primaryMid,
    borderColor: colors.primaryMid,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  optionGroup: {
    gap: 8,
  },
  optionBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  optionBtnSelected: {
    borderColor: colors.primaryMid,
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: colors.primaryMid,
    fontWeight: '700',
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    minHeight: 96,
  },
  textAreaLocked: {
    backgroundColor: colors.divider,
    borderColor: colors.border,
    color: colors.textSecondary,
  },
  issuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  issueChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  issueChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  issueText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  issueTextSelected: {
    color: colors.accent,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
