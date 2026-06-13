import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';

// Question types supported
interface Question {
  id: string;
  type: 'rating' | 'text' | 'textarea' | 'single' | 'multi';
  text: string;
  options?: string[];
  maxSelect?: number;
  required?: boolean;
}

type Answer = string | number | string[];

const RATING_LABELS: Record<number, string> = {
  1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent',
};

// ── Components ──────────────────────────────────────────────────────────────

function StarRating({ value, onChange, disabled }: {
  value: number; onChange: (v: number) => void; disabled: boolean;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => !disabled && onChange(star)}
          style={styles.starBtn} disabled={disabled}>
          <Ionicons name={star <= value ? 'star' : 'star-outline'} size={30}
            color={star <= value ? colors.accent : '#D0D5DD'} />
        </TouchableOpacity>
      ))}
      {value > 0 && <Text style={styles.ratingLabel}>{RATING_LABELS[value]}</Text>}
    </View>
  );
}

function SingleChoice({ options, value, onChange, disabled }: {
  options: string[]; value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  return (
    <View style={styles.optionList}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <TouchableOpacity key={opt} style={[styles.optionRow, selected && styles.optionRowSelected]}
            onPress={() => !disabled && onChange(opt)} disabled={disabled}>
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected && <View style={styles.radioDot} />}
            </View>
            <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiChoice({ options, value, onChange, disabled, maxSelect }: {
  options: string[]; value: string[]; onChange: (v: string[]) => void;
  disabled: boolean; maxSelect?: number;
}) {
  function toggle(opt: string) {
    if (disabled) return;
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      if (maxSelect && value.length >= maxSelect) {
        Alert.alert('Limit reached', `You can select up to ${maxSelect}.`);
        return;
      }
      onChange([...value, opt]);
    }
  }
  return (
    <View style={styles.optionList}>
      {maxSelect && <Text style={styles.optionHint}>Select up to {maxSelect}</Text>}
      {options.map((opt) => {
        const checked = value.includes(opt);
        return (
          <TouchableOpacity key={opt} style={[styles.optionRow, checked && styles.optionRowSelected]}
            onPress={() => toggle(opt)} disabled={disabled}>
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={[styles.optionLabel, checked && styles.optionLabelSelected]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function ExitTicketScreen() {
  const insets = useSafeAreaInsets();
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const { profile } = useAuth();

  const [dayTitle, setDayTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    if (!dayId || !profile) return;
    async function load() {
      // Load program day questions
      const { data: day } = await supabase
        .from('program_days')
        .select('title, questions')
        .eq('id', dayId)
        .single();

      if (day) {
        setDayTitle(day.title ?? '');
        const qs: Question[] = (day.questions ?? []).map((q: any, i: number) =>
          typeof q === 'string'
            ? { id: String(i), type: 'text', text: q }
            : { id: q.id ?? String(i), ...q }
        );
        setQuestions(qs);
        // init answers
        const init: Record<string, Answer> = {};
        qs.forEach((q) => {
          if (q.type === 'rating') init[q.id] = 0;
          else if (q.type === 'multi') init[q.id] = [];
          else init[q.id] = '';
        });
        setAnswers(init);
      }

      // Check if already submitted
      const { data: existing } = await supabase
        .from('exit_ticket_responses')
        .select('id')
        .eq('student_id', profile.id)
        .eq('program_day_id', dayId)
        .single();

      if (existing) setAlreadySubmitted(true);
      setLoading(false);
    }
    load();
  }, [dayId, profile]);

  function setAnswer(qId: string, value: Answer) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  async function handleSubmit() {
    // Validate required
    for (const q of questions) {
      if (q.required === false) continue;
      const ans = answers[q.id];
      if (q.type === 'rating' && (ans as number) === 0) {
        Alert.alert('Required', `Please answer: "${q.text}"`); return;
      }
      if ((q.type === 'text' || q.type === 'textarea' || q.type === 'single') && !(ans as string).trim()) {
        Alert.alert('Required', `Please answer: "${q.text}"`); return;
      }
      if (q.type === 'multi' && (ans as string[]).length === 0) {
        Alert.alert('Required', `Please select at least one for: "${q.text}"`); return;
      }
    }

    setSubmitting(true);
    const { error } = await supabase.from('exit_ticket_responses').insert({
      student_id: profile!.id,
      program_day_id: dayId,
      responses: { answers },
    });
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', 'Could not submit. Please try again.'); return;
    }
    setSubmitted(true);
  }

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (alreadySubmitted || submitted) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backText}>Back to Roadmap</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.doneWrap}>
          <Text style={styles.doneIcon}>✅</Text>
          <Text style={styles.doneTitle}>
            {submitted ? 'Submitted!' : 'Already Submitted'}
          </Text>
          <Text style={styles.doneSub}>
            {submitted
              ? 'Thank you for completing your exit ticket.'
              : 'You already submitted your exit ticket for this day.'}
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to Roadmap</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backText}>Back to Roadmap</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.doneWrap}>
          <Text style={styles.doneIcon}>📋</Text>
          <Text style={styles.doneTitle}>No questions yet</Text>
          <Text style={styles.doneSub}>Mrs. Sykes hasn't added questions for this day yet.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to Roadmap</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backText}>Back to Roadmap</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{dayTitle}</Text>
        <Text style={styles.headerSub}>Exit Ticket</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {questions.map((q, index) => (
          <View key={q.id} style={styles.questionCard}>
            <Text style={styles.qNumber}>{index + 1}.</Text>
            <Text style={styles.qText}>{q.text}</Text>

            {q.type === 'rating' && (
              <StarRating value={answers[q.id] as number}
                onChange={(v) => setAnswer(q.id, v)} disabled={submitting} />
            )}
            {q.type === 'text' && (
              <TextInput style={styles.textInput}
                placeholder="Your answer..." placeholderTextColor={colors.textMuted}
                value={answers[q.id] as string}
                onChangeText={(v) => setAnswer(q.id, v)}
                editable={!submitting} />
            )}
            {q.type === 'textarea' && (
              <TextInput style={[styles.textInput, styles.textArea]}
                placeholder="Your answer..." placeholderTextColor={colors.textMuted}
                value={answers[q.id] as string}
                onChangeText={(v) => setAnswer(q.id, v)}
                multiline numberOfLines={4} textAlignVertical="top"
                editable={!submitting} />
            )}
            {q.type === 'single' && q.options && (
              <SingleChoice options={q.options}
                value={answers[q.id] as string}
                onChange={(v) => setAnswer(q.id, v)} disabled={submitting} />
            )}
            {q.type === 'multi' && q.options && (
              <MultiChoice options={q.options}
                value={answers[q.id] as string[]}
                onChange={(v) => setAnswer(q.id, v)}
                disabled={submitting} maxSelect={q.maxSelect} />
            )}
          </View>
        ))}

        <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
          {submitting
            ? <ActivityIndicator color={colors.primary} />
            : <Text style={styles.submitBtnText}>Submit Exit Ticket</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  backText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 2 },
  headerSub: { color: colors.accent, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  scroll: { padding: 16, paddingBottom: 48, gap: 12 },
  questionCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  qNumber: { fontSize: 14, fontWeight: '800', color: colors.accent, marginBottom: 4 },
  qText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, lineHeight: 22, marginBottom: 14 },
  // Star rating
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starBtn: { padding: 4 },
  ratingLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginLeft: 6 },
  // Text inputs
  textInput: {
    backgroundColor: '#F8F9FA', borderRadius: 12, padding: 14,
    fontSize: 15, color: colors.textPrimary, borderWidth: 1, borderColor: '#E8EAED',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  // Options
  optionList: { gap: 8 },
  optionHint: { fontSize: 12, color: colors.textMuted, marginBottom: 4, fontStyle: 'italic' },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E8EAED',
    backgroundColor: '#FAFAFA',
  },
  optionRowSelected: { borderColor: colors.primary, backgroundColor: '#EEF3FA' },
  optionLabel: { fontSize: 15, color: colors.textPrimary, flex: 1, fontWeight: '500' },
  optionLabelSelected: { color: colors.primary, fontWeight: '700' },
  // Radio
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: '#C4C9D4', alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  // Checkbox
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2,
    borderColor: '#C4C9D4', alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  // Submit
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  // Done screen
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  doneIcon: { fontSize: 60, marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  doneSub: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  doneBtn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
