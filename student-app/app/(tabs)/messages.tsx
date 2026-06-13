import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  content: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

interface Announcement {
  id: string;
  content: string;
  created_at: string;
  cohort_id: string | null;
}

export default function MessagesScreen() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [tab, setTab] = useState<'messages' | 'announcements'>('messages');

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: msgs }, { data: ann }] = await Promise.all([
      supabase.from('messages').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    ]);

    setMessages(msgs ?? []);
    setAnnouncements(ann ?? []);
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  async function handleSend() {
    if (!newMessage.trim()) return;
    setErrorMsg('');
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    const { error } = await supabase.from('messages').insert({
      student_id: user.id,
      content: newMessage.trim(),
    });

    setSending(false);
    if (error) {
      setErrorMsg('Failed to send. Please try again.');
      return;
    }
    setNewMessage('');
    await loadData();
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        {/* Tab pills */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'messages' && styles.tabActive]}
            onPress={() => setTab('messages')}
          >
            <Text style={[styles.tabText, tab === 'messages' && styles.tabTextActive]}>
              My Messages
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'announcements' && styles.tabActive]}
            onPress={() => setTab('announcements')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.tabText, tab === 'announcements' && styles.tabTextActive]}>
                Announcements
              </Text>
              {announcements.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{announcements.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* My Messages tab */}
      {tab === 'messages' && (
        <>
          <View style={styles.composeBox}>
            <TextInput
              style={styles.input}
              placeholder="Ask Mrs. Sykes a question..."
              placeholderTextColor={colors.textMuted}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
            <TouchableOpacity
              style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={styles.sendBtnText}>Send Message</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.history} contentContainerStyle={styles.historyContent}>
            {messages.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySub}>
                  Send a question above and Mrs. Sykes will reply here.
                </Text>
              </View>
            ) : (
              messages.map((msg) => (
                <View key={msg.id} style={styles.messageCard}>
                  <View style={styles.studentBubble}>
                    <Text style={styles.studentBubbleLabel}>You</Text>
                    <Text style={styles.studentBubbleText}>{msg.content}</Text>
                    <Text style={styles.timestamp}>
                      {new Date(msg.created_at).toLocaleDateString()}{' '}
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  {msg.reply ? (
                    <View style={styles.replyBubble}>
                      <Text style={styles.replyLabel}>Mrs. Sykes</Text>
                      <Text style={styles.replyText}>{msg.reply}</Text>
                      {msg.replied_at && (
                        <Text style={styles.replyTimestamp}>
                          {new Date(msg.replied_at).toLocaleDateString()}{' '}
                          {new Date(msg.replied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>⏳ Awaiting reply</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </>
      )}

      {/* Announcements tab */}
      {tab === 'announcements' && (
        <ScrollView style={styles.history} contentContainerStyle={styles.historyContent}>
          {announcements.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📣</Text>
              <Text style={styles.emptyText}>No announcements yet</Text>
              <Text style={styles.emptySub}>
                Mrs. Sykes will post announcements here for your cohort.
              </Text>
            </View>
          ) : (
            announcements.map((ann) => (
              <View key={ann.id} style={styles.announcementCard}>
                <View style={styles.announcementHeader}>
                  <Text style={styles.announcementFrom}>📣 Mrs. Sykes</Text>
                  <Text style={styles.announcementTime}>
                    {new Date(ann.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.announcementText}>{ann.content}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 14,
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
  },
  composeBox: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  error: {
    color: '#e53935',
    fontSize: 13,
    marginBottom: 8,
  },
  sendBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  history: {
    flex: 1,
  },
  historyContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  messageCard: {
    gap: 8,
  },
  studentBubble: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    borderBottomRightRadius: 4,
    padding: 14,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  studentBubbleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  studentBubbleText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  replyBubble: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    padding: 14,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D4A853',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  replyText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
  },
  replyTimestamp: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 6,
  },
  pendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF8E7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingText: {
    fontSize: 12,
    color: '#B8860B',
    fontWeight: '600',
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  announcementFrom: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.3,
  },
  announcementTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  announcementText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
});
