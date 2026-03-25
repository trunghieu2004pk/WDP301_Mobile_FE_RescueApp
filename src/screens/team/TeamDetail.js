import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const C = {
  red: '#E8293A', redLight: '#FFF0F1', redBorder: '#FFCDD0',
  blue: '#2563EB', blueLight: '#EFF6FF', blueBorder: '#BFDBFE',
  green: '#16A34A', amber: '#D97706',
  text: '#0F172A', sub: '#64748B', muted: '#94A3B8',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
};

const STATUS_MAP = {
  AVAILABLE:  { label: 'Sẵn sàng',          color: C.green, icon: 'checkmark-circle-outline' },
  BUSY:       { label: 'Bận',                color: C.amber, icon: 'time-outline' },
  OFFLINE:    { label: 'Offline',            color: C.muted, icon: 'close-circle-outline' },
  ON_MISSION: { label: 'Đang làm nhiệm vụ', color: C.blue,  icon: 'boat-outline' },
};

const TeamDetail = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, getAuthHeaders } = useAuth();

  const [team, setTeam]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const fetchTeam = useCallback(async () => {
    const userId = user?._id || user?.id;
    if (!userId) {
      setError('Không xác định được tài khoản. Vui lòng đăng nhập lại.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);

      // ── Bước 1: Lấy toàn bộ danh sách đội ──
      const listRes = await fetch(`${API_URL}/rescue-teams`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const listData = await listRes.json().catch(() => ({}));
      if (!listRes.ok) throw new Error(listData?.message || `Lỗi ${listRes.status}`);

      const list = Array.isArray(listData)
        ? listData
        : listData?.data ?? listData?.teams ?? listData?.items ?? [];

      // ── Bước 2: Tìm team có leaderId trùng với user đang đăng nhập ──
      const myTeam = list.find((t) => {
        const lid = t?.leaderId?._id || t?.leaderId?.id || t?.leaderId;
        return String(lid) === String(userId);
      });

      if (!myTeam) {
        setError('Bạn chưa được phân công làm trưởng đội nào.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // ── Bước 3: Lấy chi tiết đội bằng _id tìm được ──
      const teamId = myTeam._id || myTeam.id;
      const detailRes = await fetch(`${API_URL}/rescue-teams/${teamId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const detailData = await detailRes.json().catch(() => ({}));
      if (!detailRes.ok) throw new Error(detailData?.message || `Lỗi ${detailRes.status}`);

      setTeam(detailData?.data ?? detailData);
    } catch (e) {
      setError(e.message || 'Không thể tải thông tin đội.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchTeam);
    return unsub;
  }, [navigation, fetchTeam]);

  const onRefresh = () => { setRefreshing(true); fetchTeam(); };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{'Thông tin đội'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.blue} />
          <Text style={styles.loadingText}>{'Đang tải thông tin đội...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error || !team) {
    return (
      <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{'Thông tin đội'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={32} color={C.red} />
          </View>
          <Text style={styles.errorTitle}>{'Không thể tải dữ liệu'}</Text>
          <Text style={styles.errorMsg}>{error || 'Không tìm thấy thông tin đội'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTeam}>
            <Ionicons name="refresh-outline" size={16} color={C.white} />
            <Text style={styles.retryBtnText}>{'Thử lại'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main ─────────────────────────────────────────────────────────────────
  const statusInfo = STATUS_MAP[team.status] || { label: team.status || '—', color: C.muted, icon: 'help-circle-outline' };
  const members    = Array.isArray(team.members) ? team.members : [];

  return (
    <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{'Thông tin đội'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
      >
        {/* ── Team card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.teamName}>{team.teamName || 'Đội cứu hộ'}</Text>
              <Text style={styles.teamCode}>
                {'#'}{team.teamCode || (team._id || team.id)?.slice(-8)?.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: statusInfo.color + '18' }]}>
              <Ionicons name={statusInfo.icon} size={13} color={statusInfo.color} />
              <Text style={[styles.pillText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailList}>
            {team.description ? <DetailRow icon="document-text-outline" value={team.description} /> : null}
            {team.contactPhone ? <DetailRow icon="call-outline" value={team.contactPhone} /> : null}
            {team.email ? <DetailRow icon="mail-outline" value={team.email} /> : null}
            <DetailRow icon="people-outline" value={`${members.length} thành viên`} />
          </View>
        </View>

        {/* ── Members ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'Thành viên đội'}</Text>

          {members.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={44} color={C.muted} />
              <Text style={styles.emptyText}>{'Chưa có thành viên nào'}</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {members.map((m, i) => (
                <View key={m._id || m.id || `m-${i}`} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarLetter}>
                      {(m.fullName || m.username || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.fullName || m.username || 'Thành viên'}</Text>
                    <Text style={styles.memberRole}>{m.role || 'Thành viên'}</Text>
                    {m.phone ? (
                      <View style={styles.memberPhoneRow}>
                        <Ionicons name="call-outline" size={12} color={C.muted} />
                        <Text style={styles.memberPhone}>{m.phone}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Sub-component ────────────────────────────────────────────────────────────
const DetailRow = ({ icon, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>
      <Ionicons name={icon} size={15} color={C.sub} />
    </View>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: C.bg },

  topBar:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:            { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  topBarTitle:        { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3 },

  center:             { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText:        { marginTop: 12, fontSize: 14, color: C.muted, fontWeight: '500' },
  errorIconWrap:      { width: 64, height: 64, borderRadius: 20, backgroundColor: C.redLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  errorTitle:         { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 6 },
  errorMsg:           { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  retryBtn:           { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.blue, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  retryBtnText:       { color: C.white, fontWeight: '700', fontSize: 14 },

  card:               { margin: 16, backgroundColor: C.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader:         { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  teamName:           { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4, marginBottom: 4 },
  teamCode:           { fontSize: 13, color: C.muted, fontWeight: '600' },
  pill:               { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pillText:           { fontSize: 12, fontWeight: '700' },
  divider:            { height: 1, backgroundColor: C.border, marginVertical: 16 },
  detailList:         { gap: 12 },
  detailRow:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon:         { width: 30, height: 30, borderRadius: 8, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  detailValue:        { fontSize: 14, color: C.sub, flex: 1, lineHeight: 20 },

  section:            { paddingHorizontal: 16, marginTop: 4 },
  sectionTitle:       { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginBottom: 12 },

  memberCard:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  memberAvatar:       { width: 44, height: 44, borderRadius: 13, backgroundColor: C.blue + '18', justifyContent: 'center', alignItems: 'center' },
  memberAvatarLetter: { fontSize: 18, fontWeight: '800', color: C.blue },
  memberName:         { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  memberRole:         { fontSize: 12, color: C.sub, marginBottom: 3 },
  memberPhoneRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberPhone:        { fontSize: 12, color: C.muted },

  emptyBox:           { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.border },
  emptyText:          { marginTop: 12, fontSize: 14, color: C.muted, fontWeight: '500' },
});

export default TeamDetail;
