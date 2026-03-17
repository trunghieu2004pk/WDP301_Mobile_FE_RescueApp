import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const STATUS_MAP = {
  PENDING:    { label: 'Chờ xử lý',     color: '#FF4D4F', icon: 'time-outline' },
  PROCESSING: { label: 'Đang xử lý',    color: '#E67E22', icon: 'construct-outline' },
  ON_THE_WAY: { label: 'Đang đến',      color: '#2E91FF', icon: 'boat-outline' },
  COMPLETED:  { label: 'Đã hoàn thành', color: '#27AE60', icon: 'checkmark-circle-outline' },
  CANCELLED:  { label: 'Đã hủy',        color: '#A4B0BE', icon: 'close-circle-outline' },
};

const getStatusInfo = (status) =>
  STATUS_MAP[status] ?? { label: status ?? '—', color: '#747D8C', icon: 'help-circle-outline' };

const parseCoordinates = (request) => {
  if (request?.latitude && request?.longitude) {
    return `${Number(request.latitude).toFixed(6)}, ${Number(request.longitude).toFixed(6)}`;
  }
  if (request?.location?.coordinates?.length === 2) {
    const [lng, lat] = request.location.coordinates;
    return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
  }
  if (typeof request?.location === 'string') return request.location;
  return '—';
};

const RescueRequestDetailScreen = ({ route, navigation }) => {
  const { request: initialRequest } = route.params;
  const insets = useSafeAreaInsets();
  const { getAuthHeaders } = useAuth();

  const [request, setRequest] = useState(initialRequest);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const id = initialRequest?._id ?? initialRequest?.id;

  useEffect(() => {
    if (!id) {
      setError('Không tìm thấy ID yêu cầu.');
      setLoading(false);
      return;
    }
    fetchDetail();
  }, []);

  const fetchDetail = async () => {
    try {
      setError(null);
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/rescue-requests/${id}`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Lỗi ${response.status}`);
      }
      const data = await response.json();
      setRequest(data?.data ?? data);
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = getStatusInfo(request?.status);

  const timelineSteps = [
    { key: 'submitted', label: 'Đã gửi yêu cầu',       icon: 'document-text-outline',    done: true },
    { key: 'processing', label: 'Đang xử lý',           icon: 'construct-outline',         done: ['PROCESSING', 'ON_THE_WAY', 'COMPLETED'].includes(request?.status) },
    { key: 'ontheway',  label: 'Đội cứu hộ đang đến',   icon: 'boat-outline',              done: ['ON_THE_WAY', 'COMPLETED'].includes(request?.status) },
    { key: 'done',      label: 'Hoàn thành',             icon: 'checkmark-circle-outline',  done: request?.status === 'COMPLETED' },
  ];

  const infoItems = [
    {
      icon: 'calendar-outline',
      label: 'Thời gian gửi',
      value: request?.createdAt ? new Date(request.createdAt).toLocaleString('vi-VN') : '—',
    },
    {
      icon: 'location-outline',
      label: 'Tọa độ',
      value: parseCoordinates(request),
    },
    {
      icon: 'person-outline',
      label: 'Họ tên',
      value: request?.userId?.fullName ?? '—',
    },
    {
      icon: 'call-outline',
      label: 'Số điện thoại',
      value: request?.userId?.phone ?? '—',
    },
    {
      icon: 'barcode-outline',
      label: 'Mã yêu cầu',
      value: request?.requestCode ?? id?.slice(-8)?.toUpperCase() ?? '—',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#2F3542" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết yêu cầu</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => { setLoading(true); fetchDetail(); }}>
          <Ionicons name="refresh-outline" size={20} color="#747D8C" />
        </TouchableOpacity>
      </View>

      {/* Loading bar */}
      {loading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color="#FF4757" />
          <Text style={styles.loadingText}>Đang tải chi tiết...</Text>
        </View>
      )}

      {/* Error banner */}
      {error && !loading && (
        <TouchableOpacity style={styles.errorBanner} onPress={() => { setLoading(true); fetchDetail(); }}>
          <Ionicons name="alert-circle-outline" size={16} color="#FF4757" />
          <Text style={styles.errorText}>{error} — Nhấn để thử lại</Text>
        </TouchableOpacity>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Banner */}
        <View style={[styles.bannerCard, { borderLeftColor: statusInfo.color }]}>
          <View style={styles.bannerTop}>
            <Text style={styles.requestIdText}>
              #{request?.requestCode ?? id?.slice(-8)?.toUpperCase() ?? '—'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
              <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>
          <Text style={styles.bannerDate}>
            {request?.createdAt ? new Date(request.createdAt).toLocaleString('vi-VN') : '—'}
          </Text>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiến trình xử lý</Text>
          <View style={styles.timeline}>
            {timelineSteps.map((step, index) => (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, step.done ? styles.timelineDotDone : styles.timelineDotPending]}>
                    <Ionicons name={step.icon} size={16} color={step.done ? '#FFFFFF' : '#A4B0BE'} />
                  </View>
                  {index < timelineSteps.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      step.done && timelineSteps[index + 1].done ? styles.timelineLineDone : styles.timelineLinePending,
                    ]} />
                  )}
                </View>
                <Text style={[styles.timelineLabel, step.done ? styles.timelineLabelDone : styles.timelineLabelPending]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin yêu cầu</Text>
          <View style={styles.infoCard}>
            {infoItems.map((item, index) => (
              <View key={item.label}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Ionicons name={item.icon} size={18} color="#2E91FF" />
                  </View>
                  <View style={styles.infoTextWrap}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={styles.infoValue}>{item.value}</Text>
                  </View>
                </View>
                {index < infoItems.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mô tả chi tiết</Text>
          <View style={styles.descriptionCard}>
            <MaterialCommunityIcons name="text-box-outline" size={20} color="#747D8C" style={{ marginBottom: 8 }} />
            <Text style={styles.descriptionText}>{request?.description ?? '—'}</Text>
          </View>
        </View>

        {/* Images */}
        {request?.images?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hình ảnh hiện trường</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {request.images.map((url, index) => (
                <Image key={index} source={{ uri: url }} style={styles.rescueImage} resizeMode="cover" />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Completed banner */}
        {request?.status === 'COMPLETED' && (
          <View style={styles.confirmedBanner}>
            <Ionicons name="checkmark-circle" size={22} color="#27AE60" />
            <Text style={styles.confirmedText}>Yêu cầu đã được hoàn thành</Text>
          </View>
        )}

        {/* Cancelled banner */}
        {request?.status === 'CANCELLED' && (
          <View style={styles.cancelledBanner}>
            <Ionicons name="close-circle" size={22} color="#A4B0BE" />
            <Text style={styles.cancelledText}>Yêu cầu đã bị hủy</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F2F6',
  },
  backBtn:    { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F2F6', justifyContent: 'center', alignItems: 'center' },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F2F6', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#2F3542' },
  loadingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, backgroundColor: '#FFF9F0', gap: 8,
  },
  loadingText: { fontSize: 13, color: '#F39C12', fontWeight: '500' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF0F1', gap: 8,
  },
  errorText: { fontSize: 13, color: '#FF4757', flex: 1 },
  scrollContent: { padding: 20 },
  bannerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 20, borderLeftWidth: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  bannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  requestIdText: { fontSize: 18, fontWeight: 'bold', color: '#2F3542' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 5 },
  statusText:  { fontSize: 13, fontWeight: 'bold' },
  bannerDate:  { fontSize: 13, color: '#747D8C', fontWeight: '500' },
  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2F3542', marginBottom: 12 },
  timeline: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  timelineRow:        { flexDirection: 'row', alignItems: 'flex-start', minHeight: 48 },
  timelineLeft:       { alignItems: 'center', width: 36, marginRight: 14 },
  timelineDot:        { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  timelineDotDone:    { backgroundColor: '#27AE60' },
  timelineDotPending: { backgroundColor: '#F1F2F6', borderWidth: 1.5, borderColor: '#DFE4EA' },
  timelineLine:       { width: 2, flex: 1, minHeight: 12 },
  timelineLineDone:   { backgroundColor: '#27AE60' },
  timelineLinePending:{ backgroundColor: '#DFE4EA' },
  timelineLabel:      { fontSize: 14, paddingTop: 8, fontWeight: '600', flex: 1 },
  timelineLabelDone:  { color: '#2F3542' },
  timelineLabelPending: { color: '#A4B0BE' },
  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  infoRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  infoIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EBF4FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoTextWrap: { flex: 1 },
  infoLabel:    { fontSize: 12, color: '#A4B0BE', fontWeight: '500', marginBottom: 2 },
  infoValue:    { fontSize: 14, color: '#2F3542', fontWeight: '600' },
  divider:      { height: 1, backgroundColor: '#F1F2F6', marginLeft: 52 },
  descriptionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  descriptionText: { fontSize: 14, color: '#2F3542', lineHeight: 22 },
  rescueImage: { width: 160, height: 120, borderRadius: 12, marginRight: 10 },
  confirmedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8F8F0', padding: 14, borderRadius: 14, marginBottom: 10, gap: 8,
  },
  confirmedText: { color: '#27AE60', fontSize: 14, fontWeight: '600' },
  cancelledBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F2F6', padding: 14, borderRadius: 14, marginBottom: 10, gap: 8,
  },
  cancelledText: { color: '#747D8C', fontSize: 14, fontWeight: '600' },
});

export default RescueRequestDetailScreen;