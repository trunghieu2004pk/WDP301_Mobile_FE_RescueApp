import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const SCREEN_WIDTH = Dimensions.get('window').width;

const STATUS_MAP = {
  PENDING:     { label: 'Đang chờ',      color: '#F39C12', icon: 'time-outline' },
  PROCESSING:  { label: 'Đang xử lý',    color: '#2E91FF', icon: 'sync-outline' },
  IN_PROGRESS: { label: 'Đang xử lý',    color: '#2E91FF', icon: 'sync-outline' },
  ON_THE_WAY:  { label: 'Đang đến',      color: '#3498DB', icon: 'boat-outline' },
  COMPLETED:   { label: 'Đã hoàn thành', color: '#27AE60', icon: 'checkmark-circle-outline' },
  CANCELLED:   { label: 'Đã hủy',        color: '#A4B0BE', icon: 'close-circle-outline' },
  VERIFIED:    { label: 'Đã xác minh',   color: '#8E44AD', icon: 'shield-checkmark-outline' },
};

const VERIFIED_STATUSES = ['VERIFIED', 'IN_PROGRESS', 'PROCESSING', 'ON_THE_WAY', 'COMPLETED'];

const EMERGENCY_LEVELS = [
  { value: 'LOW',    label: 'Thấp',       color: '#27AE60' },
  { value: 'MEDIUM', label: 'Trung bình', color: '#F39C12' },
  { value: 'HIGH',   label: 'Cao',        color: '#E74C3C' },
  { value: 'URGENT', label: 'Khẩn cấp',  color: '#FF4757' },
];

const getStatusInfo = (status) =>
  STATUS_MAP[status] || { label: status || '—', color: '#747D8C', icon: 'help-circle-outline' };

const getEmergencyInfo = (level) =>
  EMERGENCY_LEVELS.find(l => l.value === level) || { label: 'Chưa phân loại', color: '#A4B0BE' };

const getAssignedTeamName = (request) => {
  if (request?.assignedTeamId?.teamName) return request.assignedTeamId.teamName;
  if (typeof request?.assignedTeamId === 'string') return request.assignedTeamId;
  if (request?.assignedTeam) return request.assignedTeam;
  return null;
};

const extractLatLng = (request) => {
  const loc = request?.location;
  if (loc?.coordinates?.length === 2) {
    return { latitude: loc.coordinates[1], longitude: loc.coordinates[0] };
  }
  if (request?.latitude && request?.longitude) {
    return { latitude: Number(request.latitude), longitude: Number(request.longitude) };
  }
  return null;
};

const formatAddress = (geo) => {
  if (!geo) return null;
  const parts = [geo.streetNumber, geo.street, geo.district, geo.subregion, geo.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

const getImageUrl = (img) => {
  if (typeof img === 'string') return img;
  return img?.url || img?.uri || img?.path || null;
};

const RequestDetailScreen = ({ route, navigation }) => {
  const { request: initialRequest } = route.params;
  const { getAuthHeaders } = useAuth();
  const insets = useSafeAreaInsets();

  const [request, setRequest] = useState(initialRequest);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [locationAddress, setLocationAddress] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showConfirmAssignModal, setShowConfirmAssignModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [selectedEmergency, setSelectedEmergency] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [inventories, setInventories] = useState([]);
  const [inventoriesLoading, setInventoriesLoading] = useState(false);
  const [suppliesDraft, setSuppliesDraft] = useState({});

  // ─── Reverse geocode ──────────────────────────────────────────────────────
  const reverseGeocode = async (req) => {
    const coords = extractLatLng(req);
    if (!coords) return;
    setLocationLoading(true);
    try {
      const results = await Location.reverseGeocodeAsync(coords);
      if (results?.length > 0) {
        const address = formatAddress(results[0]);
        if (address) setLocationAddress(address);
      }
    } catch (e) {
      console.log('Reverse geocode error:', e);
    } finally {
      setLocationLoading(false);
    }
  };

  // ─── Fetch request detail ─────────────────────────────────────────────────
  const fetchRequestDetail = async () => {
    try {
      const id = request._id || request.id;
      const response = await fetch(`${API_URL}/rescue-requests/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Lỗi ${response.status}`);
      const data = await response.json();
      const fetched = data?.data ?? data;
      setRequest(fetched);
      reverseGeocode(fetched);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải chi tiết yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRequest) fetchRequestDetail();
  }, [initialRequest]);

  // ─── Verify ───────────────────────────────────────────────────────────────
  const verifyRequest = async () => {
    setUpdating(true);
    try {
      const id = request._id || request.id;
      const response = await fetch(`${API_URL}/rescue-requests/${id}/verify`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ urgencyLevel: request?.urgencyLevel || 'LOW' }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || `Lỗi ${response.status}`);
      }
      const data = await response.json();
      setRequest(prev => ({ ...prev, status: 'VERIFIED', ...(data?.data ?? data) }));
      Alert.alert('Thành công', 'Yêu cầu đã được xác minh');
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể xác minh yêu cầu');
    } finally {
      setUpdating(false);
    }
  };

  // ─── Fetch teams ──────────────────────────────────────────────────────────
  const fetchTeams = async () => {
    setTeamsLoading(true);
    try {
      const response = await fetch(`${API_URL}/rescue-teams/available`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Lỗi ${response.status}`);
      const data = await response.json();
      setTeams(data?.data ?? data);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải danh sách đội sẵn sàng');
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    setVehiclesLoading(true);
    try {
      const response = await fetch(`${API_URL}/vehicles/available`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Lỗi ${response.status}`);
      const data = await response.json();
      const list = Array.isArray(data) ? data : data?.data ?? data?.vehicles ?? [];
      setVehicles(list);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải danh sách phương tiện');
    } finally {
      setVehiclesLoading(false);
    }
  };

  const fetchInventories = async () => {
    setInventoriesLoading(true);
    try {
      const response = await fetch(`${API_URL}/inventories`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Lỗi ${response.status}`);
      const data = await response.json();
      const list = Array.isArray(data) ? data : data?.data ?? data?.items ?? [];
      setInventories(list);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải kho vật tư');
    } finally {
      setInventoriesLoading(false);
    }
  };

  const openAssignModal = () => {
    setSelectedTeam(null);
    setShowAssignModal(true);
    fetchTeams();
    fetchVehicles();
    fetchInventories();
  };

  // ─── Assign team ──────────────────────────────────────────────────────────
  const assignToTeam = async () => {
    if (!selectedTeam) return;
    setUpdating(true);
    try {
      const id = request._id || request.id;

      const supplies = Object.entries(suppliesDraft)
        .map(([inventoryId, quantity]) => ({ inventoryId, quantity }))
        .filter((s) => s.quantity > 0);

      const assignResponse = await fetch(`${API_URL}/rescue-requests/${id}/assign`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeam?._id || selectedTeam?.id || selectedTeam,
          vehicleId: selectedVehicle?._id || selectedVehicle?.id || selectedVehicle || null,
          supplies,
        }),
      });
      if (!assignResponse.ok) {
        const data = await assignResponse.json().catch(() => ({}));
        throw new Error(data?.message || `Lỗi ${assignResponse.status}`);
      }
      const assignData = await assignResponse.json();

      const statusResponse = await fetch(`${API_URL}/rescue-requests/${id}/status`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      if (!statusResponse.ok) {
        const data = await statusResponse.json().catch(() => ({}));
        console.warn('Cập nhật trạng thái thất bại:', data?.message);
      }
      const statusData = statusResponse.ok ? await statusResponse.json() : {};

      setRequest(prev => ({
        ...prev,
        assignedTeamId: { _id: selectedTeam._id, teamName: selectedTeam.teamName },
        status: 'IN_PROGRESS',
        ...(assignData?.data ?? assignData),
        ...(statusData?.data ?? statusData),
      }));

      setShowConfirmAssignModal(false);
      setShowAssignModal(false);
      setSelectedTeam(null);
      setSelectedVehicle(null);
      setSuppliesDraft({});
      Alert.alert('Thành công', `Đã gán yêu cầu cho ${selectedTeam.teamName} và chuyển sang đang xử lý`);
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể gán yêu cầu');
    } finally {
      setUpdating(false);
    }
  };

  // ─── Emergency level ──────────────────────────────────────────────────────
  const setEmergencyLevel = async (level) => {
    setUpdating(true);
    try {
      const id = request._id || request.id;
      const response = await fetch(`${API_URL}/rescue-requests/${id}/verify`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ urgencyLevel: level }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || `Lỗi ${response.status}`);
      }
      const data = await response.json();
      setRequest(prev => ({ ...prev, urgencyLevel: level, status: 'VERIFIED', ...(data?.data ?? data) }));
      setShowEmergencyModal(false);
      setSelectedEmergency('');
      Alert.alert('Thành công', 'Đã cập nhật mức độ khẩn cấp');
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật mức độ khẩn cấp');
    } finally {
      setUpdating(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    try { return new Date(dateString).toLocaleString('vi-VN'); }
    catch { return dateString; }
  };

  const getLocationDisplay = () => {
    if (locationAddress) return locationAddress;
    const coords = extractLatLng(request);
    if (coords) return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
    return '—';
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E91FF" />
          <Text style={styles.loadingText}>Đang tải chi tiết yêu cầu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusInfo(request?.status);
  const emergencyInfo = getEmergencyInfo(request?.urgencyLevel);
  const assignedTeamName = getAssignedTeamName(request);
  const isVerified = VERIFIED_STATUSES.includes(request?.status);
  const isAssigned = !!assignedTeamName;
  const images = (request?.images || []).map(getImageUrl).filter(Boolean);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2F3542" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết yêu cầu</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Status Banner */}
        <View style={[styles.banner, { borderLeftColor: statusInfo.color }]}>
          <View style={styles.bannerHeader}>
            <Text style={styles.requestId}>
              #{request?.requestCode || request?._id?.slice(-8)?.toUpperCase()}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
              <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>
          <Text style={styles.bannerTime}>{formatDateTime(request?.createdAt || request?.date)}</Text>
        </View>

        {/* Emergency Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mức độ khẩn cấp</Text>
          <TouchableOpacity
            style={[styles.emergencyBadge, { backgroundColor: emergencyInfo.color + '20' }]}
            onPress={() => { setSelectedEmergency(request?.urgencyLevel || ''); setShowEmergencyModal(true); }}
          >
            <Text style={[styles.emergencyText, { color: emergencyInfo.color }]}>{emergencyInfo.label}</Text>
            <Ionicons name="pencil" size={14} color={emergencyInfo.color} />
          </TouchableOpacity>
        </View>

        {/* Request Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin yêu cầu</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={18} color="#2E91FF" />
              <Text style={styles.infoLabel}>Mô tả:</Text>
              <Text style={styles.infoValue}>{request?.description || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#2E91FF" />
              <Text style={styles.infoLabel}>Vị trí:</Text>
              {locationLoading ? (
                <View style={styles.locationLoading}>
                  <ActivityIndicator size="small" color="#2E91FF" />
                  <Text style={styles.locationLoadingText}>Đang xác định địa chỉ...</Text>
                </View>
              ) : (
                <Text style={styles.infoValue} numberOfLines={2}>{getLocationDisplay()}</Text>
              )}
            </View>

            {images.length > 0 && (
              <View style={styles.imagesSection}>
                <View style={styles.imagesSectionHeader}>
                  <Ionicons name="images-outline" size={18} color="#2E91FF" />
                  <Text style={styles.infoLabel}>Hình ảnh:</Text>
                  <Text style={styles.imagesCount}>{images.length} ảnh</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailRow}>
                  {images.map((url, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.thumbnailWrap}
                      onPress={() => openLightbox(index)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: url }} style={styles.thumbnail} resizeMode="cover" />
                      <View style={styles.thumbnailOverlay}>
                        <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Assignment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phân công</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={18} color="#2E91FF" />
              <Text style={styles.infoLabel}>Đội cứu hộ:</Text>
              <Text style={[styles.infoValue, isAssigned && { color: '#2E91FF', fontWeight: '600' }]}>
                {assignedTeamName || 'Chưa phân công'}
              </Text>
            </View>
            <View style={[styles.infoRow, { marginBottom: 0 }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#2E91FF" />
              <Text style={styles.infoLabel}>Xác minh:</Text>
              <Text style={[styles.infoValue, isVerified && { color: '#27AE60', fontWeight: '600' }]}>
                {isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {!isVerified && (
            <TouchableOpacity
              style={[styles.actionButton, styles.verifyButton]}
              onPress={verifyRequest}
              disabled={updating}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Xác minh yêu cầu</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, isAssigned ? styles.assignedButton : styles.assignButton]}
            onPress={openAssignModal}
            disabled={updating}
          >
            <Ionicons name={isAssigned ? 'people' : 'person-add'} size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {isAssigned ? 'Đổi đội cứu hộ' : 'Gán đội cứu hộ'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Lightbox */}
      <Modal visible={lightboxVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.lightboxOverlay}>
          <View style={styles.lightboxHeader}>
            <Text style={styles.lightboxCounter}>{lightboxIndex + 1} / {images.length}</Text>
            <TouchableOpacity onPress={() => setLightboxVisible(false)} style={styles.lightboxClose}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={lightboxIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setLightboxIndex(index);
            }}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <View style={styles.lightboxImageWrap}>
                <Image source={{ uri: item }} style={styles.lightboxImage} resizeMode="contain" />
              </View>
            )}
          />
          {images.length > 1 && (
            <View style={styles.lightboxDots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === lightboxIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* Modal: Danh sách đội cứu hộ */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '75%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn đội cứu hộ</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color="#2F3542" />
              </TouchableOpacity>
            </View>
            {teamsLoading ? (
              <View style={styles.teamsLoading}>
                <ActivityIndicator size="large" color="#2E91FF" />
                <Text style={styles.teamsLoadingText}>Đang tải danh sách...</Text>
              </View>
            ) : teams.length === 0 ? (
              <View style={styles.teamsLoading}>
                <Ionicons name="alert-circle-outline" size={40} color="#A4B0BE" />
                <Text style={styles.teamsLoadingText}>Không có đội cứu hộ nào</Text>
              </View>
            ) : (
              <FlatList
                data={teams}
                keyExtractor={(item) => item._id}
                style={{ marginTop: 8 }}
                renderItem={({ item }) => {
                  const isCurrent = item._id === request?.assignedTeamId?._id;
                  return (
                    <TouchableOpacity
                      style={[styles.teamItem, isCurrent && styles.teamItemActive]}
                      onPress={() => { setSelectedTeam(item); setShowAssignModal(false); setShowConfirmAssignModal(true); }}
                    >
                      <View style={styles.teamItemLeft}>
                        <View style={[styles.teamAvatar, isCurrent && styles.teamAvatarActive]}>
                          <Ionicons name="people" size={20} color={isCurrent ? '#FFFFFF' : '#2E91FF'} />
                        </View>
                        <View>
                          <Text style={[styles.teamName, isCurrent && { color: '#2E91FF' }]}>
                            {item.teamName}{isCurrent ? '  ✓' : ''}
                          </Text>
                          <Text style={styles.teamSub}>
                            {item.members?.length ?? 0} thành viên{isCurrent ? ' · Đang phân công' : ''}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#A4B0BE" />
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Confirm gán đội — dùng .map() thay FlatList để tránh lỗi nested */}
      <Modal visible={showConfirmAssignModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="people-circle-outline" size={56} color="#2E91FF" />
            </View>
            <Text style={styles.modalTitle}>Xác nhận phân công</Text>

            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={styles.confirmDesc}>
                Gán yêu cầu{' '}
                <Text style={{ fontWeight: 'bold', color: '#2F3542' }}>
                  #{request?.requestCode || request?._id?.slice(-8)?.toUpperCase()}
                </Text>
                {' '}cho đội{' '}
                <Text style={{ fontWeight: 'bold', color: '#2E91FF' }}>{selectedTeam?.teamName}</Text>?
              </Text>

              {/* ── Chọn phương tiện ── */}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>Chọn phương tiện</Text>
                {vehiclesLoading ? (
                  <ActivityIndicator size="small" color="#2E91FF" />
                ) : vehicles.length === 0 ? (
                  <Text style={{ color: '#A4B0BE', fontSize: 13 }}>Không có phương tiện</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {vehicles.map((item, idx) => {
                        const label = item?.name || item?.plateNumber || item?.plate || item?.type || 'Phương tiện';
                        const isSel =
                          (selectedVehicle?._id || selectedVehicle?.id) === (item?._id || item?.id);
                        return (
                          <TouchableOpacity
                            key={item?._id || item?.id || String(idx)}
                            style={[styles.vehicleChip, isSel && styles.vehicleChipActive]}
                            onPress={() => setSelectedVehicle(item)}
                          >
                            <Text style={[styles.vehicleChipText, isSel && { color: '#FFFFFF' }]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}
              </View>

              {/* ── Vật tư kèm theo ── */}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>Vật tư kèm theo</Text>
                {inventoriesLoading ? (
                  <ActivityIndicator size="small" color="#2E91FF" />
                ) : inventories.length === 0 ? (
                  <Text style={{ color: '#A4B0BE', fontSize: 13 }}>Không có vật tư</Text>
                ) : (
                  <View>
                    {inventories.map((item, idx) => {
                      const label = item?.itemName || item?.name || item?.title || 'Vật tư';
                      const id = item?._id || item?.id;
                      const qty = suppliesDraft[id] || 0;
                      return (
                        <View key={id || String(idx)}>
                          <View style={styles.supplyRow}>
                            <Text style={styles.supplyLabel}>{label}</Text>
                            <View style={styles.supplyControls}>
                              <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() =>
                                  setSuppliesDraft(prev => ({
                                    ...prev,
                                    [id]: Math.max(0, (prev[id] || 0) - 1),
                                  }))
                                }
                              >
                                <Ionicons name="remove" size={16} color="#2E91FF" />
                              </TouchableOpacity>
                              <Text style={styles.qtyText}>{qty}</Text>
                              <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() =>
                                  setSuppliesDraft(prev => ({
                                    ...prev,
                                    [id]: (prev[id] || 0) + 1,
                                  }))
                                }
                              >
                                <Ionicons name="add" size={16} color="#2E91FF" />
                              </TouchableOpacity>
                            </View>
                          </View>
                          {idx < inventories.length - 1 && <View style={styles.separator} />}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmAssignModal(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={assignToTeam}
                disabled={updating}
              >
                {updating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalButtonText}>Xác nhận</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Phân loại khẩn cấp */}
      <Modal visible={showEmergencyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Phân loại khẩn cấp</Text>
            {EMERGENCY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.emergencyOption,
                  { backgroundColor: level.color + '20' },
                  selectedEmergency === level.value && { backgroundColor: level.color + '40' },
                ]}
                onPress={() => setSelectedEmergency(level.value)}
              >
                <Text style={[styles.emergencyOptionText, { color: level.color }]}>{level.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setShowEmergencyModal(false); setSelectedEmergency(''); }}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => setEmergencyLevel(selectedEmergency)}
                disabled={!selectedEmergency || updating}
              >
                <Text style={styles.modalButtonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {updating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
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
  scrollView: { flex: 1, padding: 16 },
  banner: {
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12,
    borderLeftWidth: 4, marginBottom: 20, borderWidth: 1, borderColor: '#F1F2F6',
  },
  bannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  requestId: { fontSize: 16, fontWeight: 'bold', color: '#2F3542' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  bannerTime: { fontSize: 12, color: '#747D8C' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#2F3542', marginBottom: 12 },
  emergencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  emergencyText: { fontSize: 14, fontWeight: '600' },
  infoCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F1F2F6' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  infoLabel: { fontSize: 14, fontWeight: '600', color: '#2F3542', minWidth: 60 },
  infoValue: { fontSize: 14, color: '#747D8C', flex: 1 },
  locationLoading: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  locationLoadingText: { fontSize: 13, color: '#A4B0BE', fontStyle: 'italic' },
  imagesSection: { marginTop: 4 },
  imagesSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  imagesCount: { fontSize: 13, color: '#747D8C' },
  thumbnailRow: { flexDirection: 'row' },
  thumbnailWrap: { marginRight: 10, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  thumbnail: { width: 90, height: 90, borderRadius: 10, backgroundColor: '#E9ECEF' },
  thumbnailOverlay: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 4, padding: 3,
  },
  lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  lightboxHeader: {
    position: 'absolute', top: 50, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20,
  },
  lightboxCounter: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  lightboxClose: { padding: 8 },
  lightboxImageWrap: { width: SCREEN_WIDTH, justifyContent: 'center', alignItems: 'center' },
  lightboxImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2 },
  lightboxDots: { position: 'absolute', bottom: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#FFFFFF', width: 18 },
  actionsSection: { gap: 12, marginBottom: 30 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12 },
  verifyButton: { backgroundColor: '#27AE60' },
  assignButton: { backgroundColor: '#2E91FF' },
  assignedButton: { backgroundColor: '#7F8C8D' },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2F3542', marginBottom: 4, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalButton: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#C0392B' },
  confirmButton: { backgroundColor: '#2E91FF' },
  modalButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  teamsLoading: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  teamsLoadingText: { fontSize: 14, color: '#747D8C' },
  teamItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 8 },
  teamItemActive: { backgroundColor: '#EBF4FF', paddingHorizontal: 8 },
  teamItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EBF4FF', justifyContent: 'center', alignItems: 'center' },
  teamAvatarActive: { backgroundColor: '#2E91FF' },
  teamName: { fontSize: 15, fontWeight: '600', color: '#2F3542' },
  teamSub: { fontSize: 12, color: '#747D8C', marginTop: 2 },
  separator: { height: 1, backgroundColor: '#F1F2F6' },
  confirmIconWrap: { alignItems: 'center', marginBottom: 8 },
  confirmDesc: { fontSize: 15, color: '#747D8C', textAlign: 'center', lineHeight: 22, marginTop: 4 },
  emergencyOption: { padding: 16, borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  emergencyOptionText: { fontSize: 16, fontWeight: '600' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  vehicleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#2E91FF' },
  vehicleChipActive: { backgroundColor: '#2E91FF' },
  vehicleChipText: { color: '#2E91FF', fontSize: 13, fontWeight: '600' },
  supplyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  supplyLabel: { fontSize: 14, color: '#2F3542', flex: 1, marginRight: 10 },
  supplyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#2E91FF', borderRadius: 8 },
  qtyText: { minWidth: 20, textAlign: 'center', fontSize: 14, color: '#2F3542' },
});

export default RequestDetailScreen;
