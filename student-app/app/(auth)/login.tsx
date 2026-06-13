import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function goAfterAuth(userId: string) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('default_password_changed')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        setErrorMsg('Your email is not on the approved roster. Contact Mrs. Sykes.');
        await supabase.auth.signOut();
        return;
      }

      if (!profile.default_password_changed) {
        router.replace('/change-password');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } catch (e) {
      setErrorMsg('Navigation error — please try again.');
    }
  }

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      // Try signing in first
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (!signInError && data?.user) {
        await goAfterAuth(data.user.id);
        return;
      }

      // First-time student: auto-create account if on roster
      if (signInError?.message?.includes('Invalid login credentials')) {
        const { data: onRoster } = await supabase.rpc('is_email_on_roster', {
          user_email: email.trim().toLowerCase(),
        });

        if (!onRoster) {
          setErrorMsg('Your email is not on the approved list. Contact Mrs. Sykes.');
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });

        // Account exists but wrong password
        if (signUpError?.message?.toLowerCase().includes('already')) {
          setErrorMsg('Incorrect password. If this is your first time, use "GOPStudent". Otherwise contact Mrs. Sykes.');
          return;
        }

        if (signUpError || !signUpData?.user) {
          setErrorMsg(signUpError?.message ?? 'Could not create account. Try again.');
          return;
        }

        await new Promise((r) => setTimeout(r, 1500));
        await goAfterAuth(signUpData.user.id);
        return;
      }

      setErrorMsg(signInError?.message ?? 'Something went wrong. Please try again.');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>GENERATION OF PROMISE</Text>
            </View>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your GOP account</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              First time signing in? Use the password{' '}
              <Text style={styles.hintBold}>GOPStudent</Text> — you'll be prompted to set a new one.
            </Text>
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 40 },
  header: { marginBottom: 40 },
  badgeRow: { flexDirection: 'row', marginBottom: 16 },
  badge: {
    backgroundColor: 'rgba(212, 168, 83, 0.2)',
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  badgeText: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { fontSize: 42, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1, marginBottom: 10 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },
  form: { gap: 18 },
  inputGroup: { gap: 6 },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  hintBox: {
    backgroundColor: 'rgba(212,168,83,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(212,168,83,0.25)',
  },
  hintText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 19 },
  hintBold: { color: colors.accent, fontWeight: '700' },
  errorText: {
    color: '#FF8A80',
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: 'rgba(198,40,40,0.15)',
    padding: 10,
    borderRadius: 8,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.primary, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
