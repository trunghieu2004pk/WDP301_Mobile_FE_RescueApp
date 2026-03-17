import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const STATUS_MAP = {
  PENDING:     { label: 'Đang chờ',      color: '#F39C12', icon: 'time-outline' },
  PROCESSING:  { label: 'Đang xử lý',    color: '#2E91FF', icon: 'sync-outline' },
  IN_PROGRESS: { label: 'Đang xử lý',    color: '#2E91FF', icon: 'sync-outline' },
  ON_THE_WAY:  { label: 'Đang đến',      color: '#3498DB', icon: 'boat-outline' },
  COMPLETED:   { label: 'Đã hoàn thành', color: '#27AE60', icon: 'checkmark-circle-outline' },
  CANCELLED:   { label: 'Đã hủy',        color: '#A4B0BE', icon: 'close-circle-outline' },
  VERIFIED:    { label: 'Đã xác minh',   color: '#8E44AD', icon: 'shield-checkmark-outline' },
};

const getStatusInfo = (status) =>
  STATUS_MAP[status] || { label: status || '—', color: '#747D8C', icon: 'help-circle-outline' };

const RequestListScreen = ({ navigation }) => {
  const { getAuthHeaders } = useAuth();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/rescue-requests`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Lỗi ${response.status}`);
      }

      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : data.data ?? data.requests ?? data.items ?? [];

      setRequests(list);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách yêu cầu.');
      Alert.alert('Lỗi', 'Không thể tải danh sách yêu cầu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load lần đầu
  useEffect(() => {
    fetchRequests();
  }, []);

  // ✅ Tự động re-fetch mỗi khi màn hình được focus lại (quay về từ Detail)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchRequests();
    });
    return unsubscribe;
  }, [navigation, fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleRequestPress = (request) => {
    navigation.navigate('RequestDetail', { request });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    try { return new Date(dateString).toLocaleString('vi-VN'); }
    catch { return dateString; }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E91FF" />
          <Text style={styles.loadingText}>Đang tải danh sách yêu cầu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2F3542" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danh sách yêu cầu</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color="#FF4757" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchRequests}>
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#A4B0BE" />
            <Text style={styles.emptyText}>Chưa có yêu cầu nào</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {requests.map((request) => {
              const statusInfo = getStatusInfo(request.status);
              return (
                <TouchableOpacity
                  key={request._id || request.id}
                  style={styles.requestCard}
                  onPress={() => handleRequestPress(request)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.requestId}>
                      #{request.requestCode || request._id?.slice(-8)?.toUpperCase()}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                      <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.description} numberOfLines={2}>
                    {request.description || 'Không có mô tả'}
                  </Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.locationInfo}>
                      <Ionicons name="location-outline" size={14} color="#747D8C" />
                      <Text style={styles.locationText}>
                        {typeof request.location === 'string'
                          ? request.location
                          : request.location?.coordinates
                            ? `${Number(request.location.coordinates[1]).toFixed(4)}, ${Number(request.location.coordinates[0]).toFixed(4)}`
                            : (request.latitude && request.longitude
                                ? `${Number(request.latitude).toFixed(4)}, ${Number(request.longitude).toFixed(4)}`
                                : '—')}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>
                      {formatDateTime(request.createdAt || request.date)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#747D8C' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F2F6',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2F3542' },
  headerRight: { width: 40 },
  scrollView: { flex: 1 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { marginTop: 16, fontSize: 16, color: '#FF4757', textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#2E91FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#A4B0BE' },
  listContainer: { padding: 16 },
  requestCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F1F2F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  requestId: { fontSize: 16, fontWeight: 'bold', color: '#2F3542' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  description: { fontSize: 14, color: '#2F3542', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  locationText: { fontSize: 12, color: '#747D8C' },
  timeText: { fontSize: 12, color: '#747D8C' },
});

export default RequestListScreen;