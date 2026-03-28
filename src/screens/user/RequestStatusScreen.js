import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const C = {
  red:      '#E8293A', redLight:  '#FFF0F1', redBorder: '#FFCDD0',
  green:    '#16A34A', greenLight:'#F0FDF4',
  blue:     '#2563EB', blueLight: '#EFF6FF',
  amber:    '#D97706', amberLight:'#FFFBEB',
  slate:    '#57606F', slateLight:'#F8FAFC',
  text:     '#0F172A', sub:       '#64748B',
  muted:    '#94A3B8', border:    '#E2E8F0',
  bg:       '#F8FAFC', white:     '#FFFFFF',
};

const STATUS_MAP = {
  PENDING:    { label: 'Đang chờ',    color: C.red,   bg: C.redLight,   icon: 'time-outline'             },
  VERIFIED:   { label: 'Đã xác minh', color: C.blue,  bg: C.blueLight,  icon: 'shield-checkmark-outline' },
  PROCESSING: { label: 'Đang xử lý', color: C.amber, bg: C.amberLight, icon: 'sync-outline'             },
  ON_THE_WAY: { label: 'Đang đến',   color: C.blue,  bg: C.blueLight,  icon: 'navigate-outline'         },
  COMPLETED:  { label: 'Hoàn thành', color: C.green, bg: C.greenLight, icon: 'checkmark-circle-outline' },
  CANCELLED:  { label: 'Đã hủy',     color: C.muted, bg: C.slateLight, icon: 'close-circle-outline'     },
};

const getStatus = (s) =>
  STATUS_MAP[s] ?? { label: s, color: C.muted, bg: C.slateLight, icon: 'help-circle-outline' };

const RequestStatusScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { getAuthHeaders, user } = useAuth();

  const [requests, setRequests]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState(null);
  const [confirmingIds, setConfirmingIds] = useState(new Set());

  const fetchRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(null);
      const response = await fetch(`${API_URL}/rescue-requests/my-requests`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Lỗi ${response.status}`);
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.data ?? data.requests ?? data.items ?? [];
      setRequests(list);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách yêu cầu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useFocusEffect(
    useCallback(() => {
      if (!user) { setLoading(false); return; }
      setLoading(true);
      fetchRequests();
    }, [user, fetchRequests])
  );

  const onRefresh = () => { setRefreshing(true); fetchRequests(true); };

  const handleConfirmRescue = (id) => {
    Alert.alert(
      'Xác nhận cứu hộ',
      'Bạn xác nhận đã được cứu hộ an toàn cho yêu cầu này?',
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xác nhận', onPress: () => confirmRescueAPI(id) },
      ]
    );
  };

  const confirmRescueAPI = async (id) => {
    setConfirmingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`${API_URL}/rescue-requests/${id}/confirm-rescued`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Lỗi ${response.status}`);
      }
      setRequests(prev =>
        prev.map(req =>
          (req._id === id || req.id === id)
            ? { ...req, status: 'COMPLETED', confirmedByUser: true }
            : req
        )
      );
      Alert.alert('✅ Thành công', 'Cảm ơn bạn đã xác nhận. Yêu cầu đã được đóng.');
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể xác nhận. Vui lòng thử lại.');
    } finally {
      setConfirmingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  // ─── Chưa đăng nhập ───────────────────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
        <View style={styles.center}>
          <View style={[styles.stateIcon, { backgroundColor: C.blueLight }]}>
            <Ionicons name="lock-closed-outline" size={36} color={C.blue} />
          </View>
          <Text style={styles.stateTitle}>Chưa đăng nhập</Text>
          <Text style={styles.stateSub}>
            Vui lòng đăng nhập để xem trạng thái yêu cầu cứu hộ của bạn.
          </Text>
          <TouchableOpacity
            style={[styles.stateBtn, { backgroundColor: C.blue }]}
            onPress={() => navigation.getParent()?.navigate('Trang chủ', { screen: 'Login' })}
          >
            <Ionicons name="log-in-outline" size={16} color={C.white} />
            <Text style={styles.stateBtnText}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.red} />
          <Text style={styles.loadingText}>Đang tải yêu cầu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error && !refreshing) {
    return (
      <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
        <View style={styles.center}>
          <View style={[styles.stateIcon, { backgroundColor: C.redLight }]}>
            <Ionicons name="cloud-offline-outline" size={36} color={C.red} />
          </View>
          <Text style={styles.stateTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.stateSub}>{error}</Text>
          <TouchableOpacity
            style={[styles.stateBtn, { backgroundColor: C.red }]}
            onPress={() => { setLoading(true); fetchRequests(); }}
          >
            <Ionicons name="refresh" size={16} color={C.white} />
            <Text style={styles.stateBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: 16 + insets.top }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.red]} tintColor={C.red} />
        }
      >
        {/* Header */}
        <View style={[styles.headerRow]}>
          <Text style={styles.headerTitle}>Yêu cầu của bạn</Text>
          {requests.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{requests.length}</Text>
            </View>
          )}
        </View>

        {/* Empty */}
        {requests.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={36} color={C.muted} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có yêu cầu nào</Text>
            <Text style={styles.emptySub}>Nhấn bên dưới để gửi yêu cầu cứu hộ đầu tiên</Text>
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => navigation.getParent()?.navigate('Trang chủ', { screen: 'EmergencyReport' })}
            >
              <Ionicons name="add-circle-outline" size={18} color={C.white} />
              <Text style={styles.newBtnText}>Gửi yêu cầu ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          requests
            .filter((item) => {
              const s = String(item.status || '').toUpperCase();
              return ['PENDING','VERIFIED','PROCESSING','IN_PROGRESS','ON_THE_WAY','COMPLETED'].includes(s);
            })
            .map((item) => {
            const id           = item._id ?? item.id;
            const s            = String(item.status || '').toUpperCase();
            const stage        =
              s === 'COMPLETED' ? { label: 'Đã xác nhận hoàn thành', color: C.green, bg: C.greenLight, icon: 'checkmark-circle-outline', done: true }
              : ['PROCESSING','IN_PROGRESS','ON_THE_WAY'].includes(s) ? { label: 'Đang xử lý', color: C.blue, bg: C.blueLight, icon: 'sync-outline', done: false }
              : { label: 'Đang chờ xác nhận', color: C.amber, bg: C.amberLight, icon: 'time-outline', done: false };

            return (
              <TouchableOpacity
                key={id}
                style={styles.card}
                activeOpacity={0.82}
                onPress={() => navigation.navigate('RescueRequestDetail', { request: item })}
              >
                {/* Card header */}
                <View style={styles.cardHead}>
                  <View style={[styles.statusBadge, { backgroundColor: stage.bg }]}>
                    <Ionicons name={stage.icon} size={13} color={stage.color} />
                    <Text style={[styles.statusText, { color: stage.color }]}>{stage.label}</Text>
                  </View>
                  <Text style={styles.reqId}>
                    #{item.requestCode ?? item.userCode ?? id?.slice(-6)?.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.divider} />

                {/* Card body */}
                <View style={styles.cardBody}>
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={13} color={C.muted} />
                    <Text style={styles.metaText}>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString('vi-VN')
                        : item.date ?? '—'}
                    </Text>
                  </View>
                  {item.address && (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={13} color={C.muted} />
                      <Text style={styles.metaText} numberOfLines={1}>{item.address}</Text>
                    </View>
                  )}
                  <View style={styles.descBox}>
                    <Text style={styles.descLabel}>Mô tả</Text>
                    <Text style={styles.descText} numberOfLines={3}>
                      {item.description ?? '—'}
                    </Text>
                  </View>
                </View>

                {/* Confirmed */}
                {stage.done && (
                  <View style={styles.confirmedRow}>
                    <Ionicons name="checkmark-circle" size={16} color={C.green} />
                    <Text style={styles.confirmedText}>Bạn đã xác nhận hoàn thành</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  scroll:       { paddingHorizontal: 18, paddingBottom: 40 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // State screens (login required / error)
  stateIcon:    { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  stateTitle:   { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8, letterSpacing: -0.3 },
  stateSub:     { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  stateBtn:     { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  stateBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },

  loadingText:  { marginTop: 12, color: C.sub, fontSize: 14 },

  // Header
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  headerTitle:  { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  countBadge:   { backgroundColor: C.red, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  countText:    { color: C.white, fontSize: 13, fontWeight: '800' },

  // Empty
  emptyWrap:    { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyIcon:    { width: 80, height: 80, borderRadius: 24, backgroundColor: C.slateLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: C.border },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptySub:     { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  newBtn:       { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.red, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14, shadowColor: C.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  newBtnText:   { color: C.white, fontWeight: '700', fontSize: 14 },

  // Card
  card:         { backgroundColor: C.white, borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
  cardHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText:   { fontSize: 12, fontWeight: '700' },
  reqId:        { fontSize: 12, color: C.muted, fontWeight: '600' },
  divider:      { height: 1, backgroundColor: C.border, marginHorizontal: 16 },

  cardBody:     { padding: 16, gap: 8 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText:     { fontSize: 13, color: C.sub, flex: 1 },
  descBox:      { backgroundColor: C.bg, borderRadius: 12, padding: 12, marginTop: 4, borderWidth: 1, borderColor: C.border },
  descLabel:    { fontSize: 11, fontWeight: '700', color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  descText:     { fontSize: 14, color: C.text, lineHeight: 21 },

  confirmBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.red, margin: 14, marginTop: 4, padding: 14, borderRadius: 14, shadowColor: C.red, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  confirmText:  { color: C.white, fontWeight: '700', fontSize: 14 },

  confirmedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.greenLight, margin: 14, marginTop: 4, padding: 11, borderRadius: 12 },
  confirmedText:{ color: C.green, fontSize: 13, fontWeight: '600' },
});

export default RequestStatusScreen;
