import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, session, signOut, refreshProfile } = useAuth();
  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');

  const initials = profile?.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  async function handleChangePassword() {
    if (!newPw || !confirmPw) { setPwError('Please fill in both fields.'); return; }
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }

    setPwLoading(true);
    setPwError('');
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);

    if (error) { setPwError(error.message); return; }

    await supabase
      .from('profiles')
      .update({ default_password_changed: true })
      .eq('id', session!.user.id);

    await refreshProfile();
    setPwModalVisible(false);
    Alert.alert('Password Updated', 'Your password has been changed successfully.');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{profile?.name ?? 'Loading...'}</Text>
          <Text style={styles.profileEmail}>{profile?.email ?? ''}</Text>
          {profile?.cohort && (
            <View style={styles.cohortBadge}>
              <Ionicons name="school-outline" size={12} color={colors.primaryMid} />
              <Text style={styles.cohortText}>{profile.cohort.name}</Text>
            </View>
          )}
        </View>

        {/* Menu items */}
        <View style={styles.menuCard}>
          <MenuRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => {
              setNewPw('');
              setConfirmPw('');
              setPwError('');
              setPwModalVisible(true);
            }}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="information-circle-outline"
            label="About Generation of Promise"
            onPress={() => Alert.alert(
              'Generation of Promise',
              'GOP is a youth leadership program at Focus: HOPE dedicated to building community among young leaders in metropolitan Detroit.',
            )}
          />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Generation of Promise · v1.0</Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={pwModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPwModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => setPwModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>New Password</Text>
              <TextInput
                style={styles.formInput}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                value={newPw}
                onChangeText={setNewPw}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Confirm Password</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Repeat your new password"
                placeholderTextColor={colors.textMuted}
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            {pwError ? <Text style={styles.errorText}>{pwError}</Text> : null}
            <TouchableOpacity
              style={[styles.submitBtn, pwLoading && styles.submitBtnDisabled]}
              onPress={handleChangePassword}
              disabled={pwLoading}
            >
              {pwLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={18} color={colors.primaryMid} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
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
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.accent,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cohortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  cohortText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryMid,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 14,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.errorLight,
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(198,40,40,0.15)',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  versionText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
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
  modalBody: {
    padding: 20,
    gap: 18,
  },
  formGroup: { gap: 6 },
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
  errorText: {
    color: colors.error,
    fontSize: 13,
    backgroundColor: colors.errorLight,
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
