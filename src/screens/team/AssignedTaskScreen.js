import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const STATUS_MAP = {
  PENDING:     { label: 'Đang chờ',      color: '#F39C12', icon: 'time-outline' },
  PROCESSING:  { label: 'Đang xử lý',   color: '#2E91FF', icon: 'sync-outline' },
  IN_PROGRESS: { label: 'Đang xử lý',   color: '#2E91FF', icon: 'sync-outline' },
  ON_THE_WAY:  { label: 'Đang đến',     color: '#3498DB', icon: 'boat-outline' },
  COMPLETED:   { label: 'Đã hoàn thành', color: '#27AE60', icon: 'checkmark-circle-outline' },
  CANCELLED:   { label: 'Đã hủy',       color: '#A4B0BE', icon: 'close-circle-outline' },
};

const URGENCY_MAP = {
  LOW:    { label: 'Thấp',       color: '#27AE60' },
  MEDIUM: { label: 'Trung bình', color: '#F39C12' },
  HIGH:   { label: 'Cao',        color: '#E74C3C' },
  URGENT: { label: 'Khẩn cấp',  color: '#FF4757' },
};

const getStatusInfo = (status) =>
  STATUS_MAP[status] || { label: status || '—', color: '#747D8C', icon: 'help-circle-outline' };

const getUrgency = (level) =>
  URGENCY_MAP[level] || { label: level || '—', color: '#A4B0BE' };

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const AssignedTaskScreen = ({ route, navigation }) => {
  const { user, getAuthHeaders } = useAuth();
  const insets = useSafeAreaInsets();

  // teamId có thể truyền qua route.params hoặc tự fetch từ user._id
  const paramTeamId = route?.params?.teamId;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);

  // ─── Bước 1: GET /rescue-teams/{user._id} → lấy _id của team ─────────────
  const resolveTeamId = useCallback(async () => {
    if (paramTeamId) return paramTeamId;
    if (!user?._id) return null;

    // GET /rescue-teams → filter team có leaderId === user._id
    const response = await fetch(`${API_URL}/rescue-teams`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`Không thể tải danh sách đội (${response.status})`);
    const data = await response.json();
    const list = Array.isArray(data) ? data : data.data ?? data.teams ?? [];

    const myTeam = list.find((team) => {
      const leaderId = team.leaderId?._id || team.leaderId;
      return leaderId === user._id;
    });

    return myTeam?._id || myTeam?.id || null;
  }, [paramTeamId, user?._id]);

  // ─── Bước 2: GET /rescue-requests/assigned-tasks?teamId=... ───────────────
  const fetchAssignedTasks = useCallback(async () => {
    try {
      setError(null);

      const teamId = await resolveTeamId();
      if (!teamId) {
        setError('Không tìm thấy ID đội. Vui lòng liên hệ quản trị viên.');
        return;
      }

      const url = `${API_URL}/rescue-requests/assigned-tasks?teamId=${teamId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Lỗi ${response.status}`);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : data.data ?? data.tasks ?? [];
      setTasks(list);
    } catch (err) {
      setError(err.message || 'Không thể tải nhiệm vụ được phân công.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolveTeamId]);

  // ─── Focus listener: refresh khi quay lại màn hình ──────────────────────
  useEffect(() => {
    fetchAssignedTasks();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAssignedTasks();
    });
    return unsubscribe;
  }, [navigation, fetchAssignedTasks]);

  // ─── Polling 30 giây: tự động cập nhật trạng thái ────────────────────────
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchAssignedTasks();
    }, 30000);
    return () => clearInterval(pollingRef.current);
  }, [fetchAssignedTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignedTasks();
  };

  // ─── Render item ──────────────────────────────────────────────────────────
  const renderTaskItem = ({ item }) => {
    const statusInfo = getStatusInfo(item.status);
    const urgency = getUrgency(item.urgencyLevel);

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => navigation.navigate('AssignedTaskDetail', { request: item })}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <Text style={styles.taskCode}>
            #{item.requestCode || item._id?.slice(-8)?.toUpperCase()}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <Ionicons name={statusInfo.icon} size={13} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <Text style={styles.taskDescription} numberOfLines={2}>
          {item.description || 'Không có mô tả'}
        </Text>

        <View style={styles.taskFooter}>
          {item.urgencyLevel && (
            <View style={[styles.urgencyBadge, { backgroundColor: urgency.color + '15' }]}>
              <Text style={[styles.urgencyText, { color: urgency.color }]}>
                {urgency.label}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={13} color="#A4B0BE" />
            <Text style={styles.detailText}>{formatDateTime(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.chevronRow}>
          <Ionicons name="chevron-forward" size={18} color="#A4B0BE" />
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2F3542" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nhiệm vụ được phân công</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2E91FF" />
          <Text style={styles.loadingText}>Đang tải nhiệm vụ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2F3542" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Nhiệm vụ được phân công</Text>
          {!error && (
            <Text style={styles.headerSub}>{tasks.length} nhiệm vụ</Text>
          )}
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color="#2E91FF" />
            : <Ionicons name="refresh" size={20} color="#2E91FF" />
          }
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={48} color="#FF4757" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAssignedTasks}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={64} color="#BDC3C7" />
              <Text style={styles.emptyText}>Chưa có nhiệm vụ nào được phân công</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F2F6',
  },
  backButton: { padding: 4, marginRight: 8 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#2F3542' },
  headerSub: { fontSize: 12, color: '#A4B0BE', marginTop: 1 },
  refreshIconBtn: { padding: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 15, color: '#747D8C' },
  errorText: { marginTop: 16, fontSize: 15, color: '#2F3542', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  retryButton: { backgroundColor: '#2E91FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
  listContainer: { padding: 16, paddingBottom: 32 },

  // Task card
  taskCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskCode: { fontSize: 13, fontWeight: '700', color: '#A4B0BE' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  taskDescription: { fontSize: 15, fontWeight: '500', color: '#2F3542', lineHeight: 22, marginBottom: 12 },
  taskFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urgencyText: { fontSize: 12, fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontSize: 12, color: '#A4B0BE' },
  chevronRow: { position: 'absolute', right: 12, top: '50%' },
  emptyText: { marginTop: 16, fontSize: 15, color: '#BDC3C7', textAlign: 'center' },
});

export default AssignedTaskScreen;