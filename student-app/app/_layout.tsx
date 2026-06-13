import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/hooks/useAuth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="exit-ticket/race-culture" />
        <Stack.Screen name="exit-ticket/[dayId]" />
        <Stack.Screen name="forms/[formId]" />
      </Stack>
    </AuthProvider>
  );
}
