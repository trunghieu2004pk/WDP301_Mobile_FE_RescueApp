import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const STATUS_MAP = {
  PENDING:    { label: 'Đang chờ xử lý', color: '#FF4D4F', icon: 'time-outline' },
  PROCESSING: { label: 'Đang xử lý',     color: '#F39C12', icon: 'time-outline' },
  ON_THE_WAY: { label: 'Đang đến',       color: '#2E91FF', icon: 'boat-outline' },
  COMPLETED:  { label: 'Đã hoàn thành',  color: '#27AE60', icon: 'checkmark-circle-outline' },
  CANCELLED:  { label: 'Đã hủy',         color: '#A4B0BE', icon: 'close-circle-outline' },
};

const getStatusInfo = (status) =>
  STATUS_MAP[status] ?? { label: status, color: '#747D8C', icon: 'help-circle-outline' };

const RequestStatusScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { getAuthHeaders } = useAuth();

  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  // Track which request IDs are currently confirming
  const [confirmingIds, setConfirmingIds] = useState(new Set());

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
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

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  // ─── Xác nhận đã được cứu hộ — PATCH /rescue-requests/{id}/confirm-rescued ─
  const handleConfirmRescue = (id) => {
    Alert.alert(
      'Xác nhận cứu hộ',
      'Bạn xác nhận đã được cứu hộ/cứu trợ an toàn cho yêu cầu này?',
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xác nhận', style: 'default', onPress: () => confirmRescueAPI(id) },
      ]
    );
  };

  const confirmRescueAPI = async (id) => {
    // Thêm id vào set đang loading
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

      // Cập nhật local state ngay — không cần reload toàn bộ
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
      setConfirmingIds(prev => {
        const next = new Set(prev); next.delete(id); return next;
      });
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.centerContainer, { paddingTop: insets.top + 20 }]}>
          <ActivityIndicator size="large" color="#FF4757" />
          <Text style={styles.loadingText}>Đang tải yêu cầu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.centerContainer, { paddingTop: insets.top + 20 }]}>
          <Ionicons name="cloud-offline-outline" size={64} color="#CED6E0" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchRequests(); }}>
            <Ionicons name="refresh" size={18} color="#FFF" />
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF4757']}
            tintColor="#FF4757"
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Yêu cầu của bạn</Text>
          <Text style={styles.countBadge}>{requests.length}</Text>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={80} color="#CED6E0" />
            <Text style={styles.emptyText}>Bạn chưa có yêu cầu cứu hộ nào.</Text>
            <TouchableOpacity
              style={styles.newRequestBtn}
              onPress={() => navigation.navigate('EmergencyReport')}
            >
              <Text style={styles.newRequestBtnText}>Gửi yêu cầu ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          requests.map((item) => {
            const id = item._id ?? item.id;
            const statusInfo = getStatusInfo(item.status);
            const isCompleted = item.status === 'COMPLETED';
            const isConfirmed = isCompleted || item.confirmedByUser;
            const isConfirming = confirmingIds.has(id);

            return (
              <TouchableOpacity
                key={id}
                style={styles.requestCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('RescueRequestDetail', { request: item })}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                    <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                  <Text style={styles.requestId}>
                    #{item.requestCode ?? item.userCode ?? id?.slice(-6)?.toUpperCase()}
                  </Text>
                </View>

                {/* Card Body */}
                <View style={styles.cardBody}>
                  <Text style={styles.dateText}>
                    Thời gian: {item.createdAt
                      ? new Date(item.createdAt).toLocaleString('vi-VN')
                      : item.date ?? '—'}
                  </Text>
                  {item.address && (
                    <View style={styles.infoRow}>
                      <Ionicons name="location" size={16} color="#747D8C" />
                      <Text style={styles.infoText}>{item.address}</Text>
                    </View>
                  )}
                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionLabel}>Mô tả:</Text>
                    <Text style={styles.descriptionContent} numberOfLines={3}>
                      {item.description ?? '—'}
                    </Text>
                  </View>
                </View>

                {/* Confirm button — chỉ hiện khi chưa hoàn thành */}
                {!isConfirmed && (
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={[styles.confirmBtn, isConfirming && styles.confirmBtnDisabled]}
                      onPress={(e) => { e.stopPropagation?.(); handleConfirmRescue(id); }}
                      disabled={isConfirming}
                    >
                      {isConfirming ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Ionicons name="checkbox" size={20} color="#FFF" />
                      )}
                      <Text style={styles.confirmBtnText}>
                        {isConfirming ? 'Đang xác nhận...' : 'Xác nhận đã được cứu hộ'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Confirmed badge */}
                {isConfirmed && (
                  <View style={styles.confirmedBox}>
                    <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
                    <Text style={styles.confirmedText}>Bạn đã xác nhận hoàn thành</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent:   { paddingHorizontal: 20, paddingBottom: 40 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  headerRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  headerTitle:     { fontSize: 24, fontWeight: 'bold', color: '#2F3542' },
  countBadge: {
    backgroundColor: '#FF4757', color: '#FFF', fontSize: 13, fontWeight: 'bold',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden',
  },
  loadingText: { marginTop: 12, color: '#747D8C', fontSize: 14 },
  errorText:   { color: '#747D8C', fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF4757',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  retryBtnText: { color: '#FFF', fontWeight: 'bold' },
  requestCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#F1F2F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText:  { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
  requestId:   { fontSize: 13, color: '#A4B0BE', fontWeight: '600' },
  cardBody:    { marginBottom: 15 },
  dateText:    { fontSize: 13, color: '#747D8C', marginBottom: 10, fontWeight: '500' },
  infoRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText:    { fontSize: 14, color: '#2F3542', marginLeft: 6, fontWeight: '500', flex: 1 },
  descriptionBox:     { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 10 },
  descriptionLabel:   { fontSize: 12, fontWeight: 'bold', color: '#747D8C', marginBottom: 4 },
  descriptionContent: { fontSize: 14, color: '#2F3542', lineHeight: 20 },
  cardFooter:   { borderTopWidth: 1, borderTopColor: '#F1F2F6', paddingTop: 15 },
  confirmBtn: {
    backgroundColor: '#FF4757', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8,
  },
  confirmBtnDisabled: { backgroundColor: '#FF475799' },
  confirmBtnText:  { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  confirmedBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 10, backgroundColor: '#E8F8F0', padding: 8, borderRadius: 8,
  },
  confirmedText:   { color: '#27AE60', fontSize: 13, fontWeight: '600', marginLeft: 5 },
  emptyContainer:  { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText:       { fontSize: 16, color: '#A4B0BE', marginTop: 15, marginBottom: 25, textAlign: 'center' },
  newRequestBtn:   { backgroundColor: '#FF4757', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 12 },
  newRequestBtnText: { color: '#FFF', fontWeight: 'bold' },
});

export default RequestStatusScreen;