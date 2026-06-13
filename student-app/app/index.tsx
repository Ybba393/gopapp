import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/constants/colors';

export default function Index() {
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace('/(auth)/login');
      return;
    }

    if (profile && !profile.default_password_changed) {
      router.replace('/change-password');
      return;
    }

    if (profile) {
      router.replace('/(tabs)/dashboard');
      return;
    }

    // Session exists but no profile (email not on roster)
    router.replace('/(auth)/login');
  }, [session, profile, loading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
