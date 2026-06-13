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

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function switchMode(m: Mode) {
    setMode(m);
    setName(''); setEmail(''); setPassword(''); setErrorMsg('');
  }

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

  async function handleLogin() {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError || !data?.user) {
        setErrorMsg('Invalid email or password. Please try again.');
        return;
      }

      await goAfterAuth(data.user.id);
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      // Check roster
      const { data: onRoster } = await supabase.rpc('is_email_on_roster', {
        user_email: email.trim().toLowerCase(),
      });

      if (!onRoster) {
        setErrorMsg('Your email is not on the approved roster. Please contact Mrs. Sykes.');
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError || !data?.user) {
        setErrorMsg(authError?.message ?? 'Sign up failed. Please try again.');
        return;
      }

      // Give DB trigger 1.5s to create the profile
      await new Promise((r) => setTimeout(r, 1500));
      await goAfterAuth(data.user.id);
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>GENERATION OF PROMISE</Text>
            </View>
          </View>
          <Text style={styles.title}>JOIN GOP</Text>
          <Text style={styles.subtitle}>
            {mode === 'login'
              ? 'Welcome back. Sign in to continue.'
              : 'Create your account to get started.'}
          </Text>
        </View>

        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
            onPress={() => switchMode('login')}
          >
            <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'signup' && styles.toggleBtnActive]}
            onPress={() => switchMode('signup')}
          >
            <Text style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

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
              placeholder={mode === 'signup' ? 'Default: GOPStudent' : 'Your password'}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            {mode === 'signup' && (
              <Text style={styles.hint}>
                Your default password is{' '}
                <Text style={styles.hintBold}>GOPStudent</Text>. You'll be asked to change it
                after signing up.
              </Text>
            )}
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={mode === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.buttonText}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <Text
            style={styles.footerLink}
            onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: 'rgba(212, 168, 83, 0.2)',
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 22,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    fontSize: 15,
  },
  toggleTextActive: {
    color: colors.primary,
  },
  form: {
    gap: 18,
    marginBottom: 24,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
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
  hint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  hintBold: {
    color: colors.accent,
    fontWeight: '600',
  },
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  footerLink: {
    color: colors.accent,
    fontWeight: '600',
  },
});
