import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl, Modal, Alert,
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

const STATUS_OPTIONS = [
  { value: 'AVAILABLE',  label: 'Sẵn sàng',          color: C.green, icon: 'checkmark-circle', desc: 'Đội sẵn sàng nhận nhiệm vụ mới' },
  { value: 'BUSY',       label: 'Bận',                color: C.amber, icon: 'time',             desc: 'Đội đang bận, tạm không nhận nhiệm vụ' },
  { value: 'OFFLINE',    label: 'Offline',            color: C.muted, icon: 'moon',             desc: 'Đội đang ngoại tuyến' },
  { value: 'ON_MISSION', label: 'Đang làm nhiệm vụ', color: C.blue,  icon: 'rocket',           desc: 'Đội đang thực hiện nhiệm vụ' },
];

const TeamDetail = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, getAuthHeaders } = useAuth();

  const [team, setTeam]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('AVAILABLE');

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
      const listRes = await fetch(`${API_URL}/rescue-teams`, {
        method: 'GET', headers: getAuthHeaders(),
      });
      const listData = await listRes.json().catch(() => ({}));
      if (!listRes.ok) throw new Error(listData?.message || `Lỗi ${listRes.status}`);
      const list = Array.isArray(listData)
        ? listData
        : listData?.data ?? listData?.teams ?? listData?.items ?? [];
      const myTeam = list.find((t) => {
        const lid = t?.leaderId?._id || t?.leaderId?.id || t?.leaderId;
        return String(lid) === String(userId);
      });
      if (!myTeam) {
        setError('Bạn chưa được phân công làm trưởng đội nào.');
        setLoading(false); setRefreshing(false); return;
      }
      const teamId = myTeam._id || myTeam.id;
      const detailRes = await fetch(`${API_URL}/rescue-teams/${teamId}`, {
        method: 'GET', headers: getAuthHeaders(),
      });
      const detailData = await detailRes.json().catch(() => ({}));
      if (!detailRes.ok) throw new Error(detailData?.message || `Lỗi ${detailRes.status}`);
      setTeam(detailData?.data ?? detailData);
    } catch (e) {
      setError(e.message || 'Không thể tải thông tin đội.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchTeam);
    return unsub;
  }, [navigation, fetchTeam]);
  useEffect(() => {
    if (team?.status) setSelectedStatus(team.status);
  }, [team]);

  const onRefresh = () => { setRefreshing(true); fetchTeam(); };

  const updateStatus = async () => {
    if (!team) return;
    const teamId = team._id || team.id;
    if (!teamId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/rescue-teams/${teamId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: selectedStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Lỗi ${res.status}`);
      setShowStatusModal(false);
      await fetchTeam();
      Alert.alert('Thành công', 'Đã cập nhật trạng thái đội.');
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Thông tin đội</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.blue} />
          <Text style={styles.loadingText}>Đang tải thông tin đội...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !team) {
    return (
      <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Thông tin đội</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={32} color={C.red} />
          </View>
          <Text style={styles.errorTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.errorMsg}>{error || 'Không tìm thấy thông tin đội'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTeam}>
            <Ionicons name="refresh-outline" size={16} color={C.white} />
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo  = STATUS_MAP[team.status] || { label: team.status || '—', color: C.muted, icon: 'help-circle-outline' };
  const members     = Array.isArray(team.members) ? team.members : [];
  const selectedOpt = STATUS_OPTIONS.find(o => o.value === selectedStatus);

  return (
    <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Thông tin đội</Text>
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

          <TouchableOpacity style={styles.updateBtn} onPress={() => setShowStatusModal(true)}>
            <Ionicons name="refresh-outline" size={16} color={C.white} />
            <Text style={styles.updateBtnText}>Cập nhật trạng thái</Text>
          </TouchableOpacity>
        </View>

        {/* ── Members ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thành viên đội</Text>
          {members.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={44} color={C.muted} />
              <Text style={styles.emptyText}>Chưa có thành viên nào</Text>
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

      {/* ══ Bottom Sheet: Cập nhật trạng thái ══ */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowStatusModal(false)}
          />

          <View style={styles.sheet}>
            {/* Handle bar */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={20} color={C.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Trạng thái đội</Text>
                <Text style={styles.sheetSubtitle}>Chọn trạng thái hoạt động hiện tại</Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setShowStatusModal(false)}
              >
                <Ionicons name="close" size={16} color={C.sub} />
              </TouchableOpacity>
            </View>

            {/* Current status */}
            {team?.status && (
              <View style={styles.currentRow}>
                <Text style={styles.currentLabel}>Hiện tại:</Text>
                <View style={[styles.currentChip, { backgroundColor: (STATUS_MAP[team.status]?.color || C.muted) + '15' }]}>
                  <View style={[styles.currentDot, { backgroundColor: STATUS_MAP[team.status]?.color || C.muted }]} />
                  <Text style={[styles.currentChipText, { color: STATUS_MAP[team.status]?.color || C.muted }]}>
                    {STATUS_MAP[team.status]?.label || team.status}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.sheetDivider} />

            {/* 2×2 Option grid */}
            <View style={styles.optionsGrid}>
              {STATUS_OPTIONS.map(opt => {
                const isSelected = selectedStatus === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionCard,
                      isSelected && {
                        borderColor: opt.color,
                        backgroundColor: opt.color + '0D',
                        shadowColor: opt.color,
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        elevation: 5,
                      },
                    ]}
                    onPress={() => setSelectedStatus(opt.value)}
                    activeOpacity={0.72}
                  >
                    {/* Check badge */}
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: opt.color }]}>
                        <Ionicons name="checkmark" size={9} color="#FFF" />
                      </View>
                    )}

                    {/* Icon */}
                    <View style={[
                      styles.optionIconCircle,
                      {
                        backgroundColor: isSelected ? opt.color + '1A' : C.bg,
                        borderColor: isSelected ? opt.color + '35' : C.border,
                      },
                    ]}>
                      <Ionicons
                        name={opt.icon}
                        size={24}
                        color={isSelected ? opt.color : C.muted}
                      />
                    </View>

                    <Text style={[styles.optionLabel, isSelected && { color: opt.color, fontWeight: '800' }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.optionDesc} numberOfLines={2}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: selectedOpt?.color || C.blue },
                submitting && { opacity: 0.65 },
              ]}
              onPress={updateStatus}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.confirmBtnText}>
                    Xác nhận — {selectedOpt?.label}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 8 }} />
          </View>
        </View>
      </Modal>
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
  updateBtn:          { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.blue, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  updateBtnText:      { color: C.white, fontWeight: '700', fontSize: 14 },
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

  // ── Bottom Sheet ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.52)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14,
  },
  sheetIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.blueLight,
    justifyContent: 'center', alignItems: 'center',
  },
  sheetTitle:    { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  sheetSubtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  sheetCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },

  currentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  currentLabel: { fontSize: 13, color: C.muted, fontWeight: '500' },
  currentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  currentDot:      { width: 7, height: 7, borderRadius: 4 },
  currentChipText: { fontSize: 13, fontWeight: '700' },

  sheetDivider: { height: 1, backgroundColor: C.border, marginBottom: 16 },

  // 2×2 grid
  optionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18,
  },
  optionCard: {
    width: '47.5%',
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    minHeight: 120,
  },
  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  optionIconCircle: {
    width: 46, height: 46, borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  optionLabel: {
    fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4,
  },
  optionDesc: {
    fontSize: 11, color: C.muted, lineHeight: 15,
  },

  // Confirm
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  confirmBtnText: {
    color: '#FFF', fontWeight: '800', fontSize: 15, letterSpacing: -0.2,
  },
});

export default TeamDetail;