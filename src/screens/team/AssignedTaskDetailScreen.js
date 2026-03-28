import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Linking,
  Image,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const DEFAULT_LOCATION = {
  latitude: 10.8412,
  longitude: 106.7749,
};

const STATUS_MAP = {
  PENDING:     { label: 'Đang chờ',       color: '#F39C12', icon: 'time-outline' },
  PROCESSING:  { label: 'Đang xử lý',    color: '#2E91FF', icon: 'sync-outline' },
  IN_PROGRESS: { label: 'Đang cứu hộ',   color: '#2E91FF', icon: 'construct-outline' },
  ON_THE_WAY:  { label: 'Đang đến',      color: '#3498DB', icon: 'boat-outline' },
  RESOLVED:    { label: 'Đã hoàn thành', color: '#27AE60', icon: 'checkmark-circle-outline' },
  COMPLETED:   { label: 'Đã hoàn thành', color: '#27AE60', icon: 'checkmark-circle-outline' },
  CANCELLED:   { label: 'Đã hủy',        color: '#A4B0BE', icon: 'close-circle-outline' },
};

const URGENCY_MAP = {
  LOW:    { label: 'Thấp',       color: '#27AE60' },
  MEDIUM: { label: 'Trung bình', color: '#F39C12' },
  HIGH:   { label: 'Cao',        color: '#E74C3C' },
  URGENT: { label: 'Khẩn cấp',  color: '#FF4757' },
};

const TERMINAL_STATUSES = ['COMPLETED', 'RESOLVED', 'CANCELLED'];

const getStatusInfo = (s) =>
  STATUS_MAP[s] || { label: s || '—', color: '#747D8C', icon: 'help-circle-outline' };
const getUrgency = (l) =>
  URGENCY_MAP[l] || { label: l || '—', color: '#A4B0BE' };

const formatDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (m) => {
  if (m == null) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
};

const getRequestCoords = (req) => {
  const lat = req?.location?.coordinates?.[1] ?? req?.latitude;
  const lng = req?.location?.coordinates?.[0] ?? req?.longitude;
  if (!lat || !lng) return null;
  return { latitude: Number(lat), longitude: Number(lng) };
};

const decodePolyline = (encoded) => {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

// ─── Component ────────────────────────────────────────────────────────────────
const AssignedTaskDetailScreen = ({ route, navigation }) => {
  const { request } = route.params;
  const { user, getAuthHeaders } = useAuth();
  const insets = useSafeAreaInsets();
  const mapRef     = useRef(null);
  const watchRef   = useRef(null);
  const lastApiRef = useRef(0);
  const teamIdRef  = useRef(null);

  const [userLocation, setUserLocation]           = useState(DEFAULT_LOCATION);
  const [locationLabel, setLocationLabel]         = useState('Mặc định – Quận 9');
  const [loadingLocation, setLoadingLocation]     = useState(false);
  const [requestDetail, setRequestDetail]         = useState(request);
  const [loadingDetail, setLoadingDetail]         = useState(!request);
  const [routeCoords, setRouteCoords]             = useState([]);
  const [navigating, setNavigating]               = useState(false);
  const [tracking, setTracking]                   = useState(false);
  const [statusUpdating, setStatusUpdating]       = useState(false);

  // ── Form hoàn thành
  const [showCompleteForm, setShowCompleteForm]   = useState(false);
  const [evidenceImageUri, setEvidenceImageUri]   = useState(null);
  const [evidenceImageUrl, setEvidenceImageUrl]   = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [cancelReason, setCancelReason]           = useState('');
  const [showConfirmModal, setShowConfirmModal]   = useState(false);
  const [showSuccessModal, setShowSuccessModal]   = useState(false);
  const [showErrorModal, setShowErrorModal]       = useState(false);

  const requestCoords = getRequestCoords(requestDetail);
  const isTerminal    = TERMINAL_STATUSES.includes(requestDetail?.status);

  // ─── Lấy teamId ───────────────────────────────────────────────────────────
  const getTeamId = useCallback(async () => {
    if (teamIdRef.current) return teamIdRef.current;
    try {
      const res = await fetch(`${API_URL}/rescue-teams`, {
        method: 'GET', headers: getAuthHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data ?? data.teams ?? [];
      const myTeam = list.find((t) => (t.leaderId?._id || t.leaderId) === user?._id);
      const id = myTeam?._id || myTeam?.id || null;
      teamIdRef.current = id;
      return id;
    } catch (e) { console.warn('getTeamId error:', e); return null; }
  }, [user?._id, getAuthHeaders]);

  // ─── Upload vị trí (throttle 5 s) ────────────────────────────────────────
  const uploadLocation = useCallback(async (coords) => {
    const now = Date.now();
    if (now - lastApiRef.current < 5000) return;
    lastApiRef.current = now;
    try {
      const teamId = await getTeamId();
      if (!teamId) return;
      await fetch(`${API_URL}/rescue-teams/${teamId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
      });
    } catch (e) { console.warn('Upload location error:', e); }
  }, [getTeamId, getAuthHeaders]);

  // ─── GPS tracking ─────────────────────────────────────────────────────────
  const startTracking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    setTracking(true);
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
      ({ coords }) => {
        const newCoords = { latitude: coords.latitude, longitude: coords.longitude };
        setUserLocation(newCoords);
        setLocationLabel('GPS thiết bị');
        uploadLocation(newCoords);
      },
    );
  }, [uploadLocation]);

  const stopTracking = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    setTracking(false);
  }, []);

  useEffect(() => () => stopTracking(), [stopTracking]);

  // ─── Upload ảnh minh chứng ────────────────────────────────────────────────
  const uploadEvidenceImage = useCallback(async (uri) => {
    const last   = uri.split('/').pop() || 'photo.jpg';
    const hasExt = last.includes('.');
    const ext    = hasExt ? last.split('.').pop().toLowerCase() : 'jpg';
    const name   = hasExt ? last : `${last}.jpg`;
    const type   =
      ext === 'jpg' || ext === 'jpeg'  ? 'image/jpeg' :
      ext === 'png'                    ? 'image/png'  :
      ext === 'webp'                   ? 'image/webp' :
      ext === 'heic' || ext === 'heif' ? 'image/jpeg' :
      'image/jpeg';

    const formData = new FormData();
    formData.append('file', { uri, name, type });

    const auth    = getAuthHeaders();
    const headers = Object.fromEntries(
      Object.entries(auth).filter(([k]) => k.toLowerCase() !== 'content-type'),
    );
    const res  = await fetch(`${API_URL}/upload/image`, { method: 'POST', headers, body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Upload thất bại: ${res.status}`);
    return data?.url || data?.data?.url || '';
  }, [getAuthHeaders]);

  // ─── Xử lý sau khi chọn/chụp ảnh ────────────────────────────────────────
  const handleEvidenceSelected = useCallback(async (uri) => {
    setEvidenceImageUri(uri);
    setEvidenceImageUrl('');
    setUploadingEvidence(true);
    try {
      const url = await uploadEvidenceImage(uri);
      setEvidenceImageUrl(url);
    } catch (e) {
      Alert.alert('Upload thất bại', e.message || 'Không thể tải ảnh lên.');
      setEvidenceImageUri(null);
    } finally {
      setUploadingEvidence(false);
    }
  }, [uploadEvidenceImage]);

  const pickEvidenceFromLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền bị từ chối', 'Ứng dụng cần quyền truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) handleEvidenceSelected(result.assets[0].uri);
  }, [handleEvidenceSelected]);

  const takeEvidencePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền bị từ chối', 'Ứng dụng cần quyền truy cập camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) handleEvidenceSelected(result.assets[0].uri);
  }, [handleEvidenceSelected]);

  const removeEvidenceImage = useCallback(() => {
    setEvidenceImageUri(null);
    setEvidenceImageUrl('');
  }, []);

  // ─── PATCH /rescue-requests/{id}/status ──────────────────────────────────
  const patchStatus = useCallback(async (payload) => {
    const id = requestDetail?._id || requestDetail?.id;
    console.log('patchStatus id:', id, '| payload:', JSON.stringify(payload));
    if (!id) { Alert.alert('Lỗi', 'Không tìm được ID yêu cầu'); return null; }
    setStatusUpdating(true);
    try {
      const response = await fetch(`${API_URL}/rescue-requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      console.log('PATCH status response:', response.status, responseText);
      if (!response.ok) {
        let errMsg = `Lỗi ${response.status}`;
        try {
          const errJson = JSON.parse(responseText);
          errMsg += ': ' + (errJson?.message || errJson?.error || responseText);
        } catch { if (responseText) errMsg += ': ' + responseText; }
        throw new Error(errMsg);
      }
      const data    = JSON.parse(responseText);
      const updated = data?.data ?? data;
      setRequestDetail((prev) => ({
        ...prev, ...updated, status: updated?.status ?? payload.status,
      }));
      return updated;
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể cập nhật trạng thái');
      return null;
    } finally { setStatusUpdating(false); }
  }, [requestDetail, getAuthHeaders]);

  // ─── Đánh dấu IN_PROGRESS ────────────────────────────────────────────────
  const markInProgress = useCallback(async () => {
    const result = await patchStatus({ status: 'IN_PROGRESS' });
    if (result) Alert.alert('✅ Thành công', 'Đã cập nhật: Đang cứu hộ');
  }, [patchStatus]);

  // ─── Mở form hoàn thành ───────────────────────────────────────────────────
  const openCompleteForm = useCallback(() => {
    setEvidenceImageUri(null);
    setEvidenceImageUrl('');
    setCancelReason('');
    setShowCompleteForm(true);
  }, []);

  // ─── Xác nhận hoàn thành → PATCH COMPLETED ───────────────────────────────
  const confirmCompletion = useCallback(async () => {
    if (uploadingEvidence) {
      Alert.alert('Vui lòng chờ', 'Ảnh đang được tải lên...');
      return;
    }
    const payload = { status: 'COMPLETED' };
    const evidenceSan = (evidenceImageUrl || '').trim().split('`').join('');
    const reasonSan   = (cancelReason || '').trim();
    if (evidenceSan) payload.evidenceImage = evidenceSan;
    if (reasonSan)   payload.cancelReason  = reasonSan;

    const result = await patchStatus(payload);
    if (result) {
      setShowConfirmModal(false);
      setShowCompleteForm(false);
      setEvidenceImageUri(null);
      setEvidenceImageUrl('');
      setCancelReason('');
      setShowSuccessModal(true);
    }
  }, [patchStatus, evidenceImageUrl, cancelReason, uploadingEvidence]);

  // ─── GPS ban đầu ──────────────────────────────────────────────────────────
  const initLocation = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: true,
        });
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(coords);
        setLocationLabel('GPS thiết bị');
        if (requestCoords) {
          mapRef.current?.fitToCoordinates([coords, requestCoords], {
            edgePadding: { top: 120, right: 40, bottom: 320, left: 40 }, animated: true,
          });
        } else {
          mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 800);
        }
      }
    } catch { /* giữ DEFAULT_LOCATION */ }
    finally { setLoadingLocation(false); }
  }, [requestCoords]);

  const fetchRequestDetail = useCallback(async () => {
    if (!request?._id && !request?.id) return;
    setLoadingDetail(true);
    try {
      const response = await fetch(
        `${API_URL}/rescue-requests/${request._id || request.id}`,
        { method: 'GET', headers: getAuthHeaders() },
      );
      if (!response.ok) throw new Error(`Lỗi ${response.status}`);
      const data = await response.json();
      setRequestDetail(data?.data ?? data);
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể tải chi tiết yêu cầu');
    } finally { setLoadingDetail(false); }
  }, [request, getAuthHeaders]);

  useEffect(() => {
    if (!request) {
      Alert.alert('Lỗi', 'Không có thông tin yêu cầu');
      navigation.goBack();
      return;
    }
    initLocation();
    if (!request.description || !request.location) fetchRequestDetail();
  }, []);

  // ─── Chỉ đường (OSRM) ─────────────────────────────────────────────────────
  const handleNavigate = async () => {
    startTracking();
    if (!requestCoords) return;
    setNavigating(true);
    setRouteCoords([]);
    try {
      const { latitude: oLat, longitude: oLng } = userLocation;
      const { latitude: dLat, longitude: dLng } = requestCoords;
      const url =
        `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}` +
        `?overview=full&geometries=polyline`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.length > 0) {
        const points = decodePolyline(data.routes[0].geometry);
        setRouteCoords(points);
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 120, right: 40, bottom: 320, left: 40 }, animated: true,
        });
      } else {
        setRouteCoords([userLocation, requestCoords]);
        mapRef.current?.fitToCoordinates([userLocation, requestCoords], {
          edgePadding: { top: 120, right: 40, bottom: 320, left: 40 }, animated: true,
        });
        Alert.alert('Lưu ý', 'Không tìm được tuyến đường, hiển thị đường thẳng.');
      }
    } catch {
      setRouteCoords([userLocation, requestCoords]);
      mapRef.current?.fitToCoordinates([userLocation, requestCoords], {
        edgePadding: { top: 120, right: 40, bottom: 320, left: 40 }, animated: true,
      });
    }
  };

  const handleCancelNavigate = () => { setNavigating(false); setRouteCoords([]); stopTracking(); };

  const handleOpenGoogleMaps = () => {
    if (!requestCoords) return;
    const { latitude, longitude } = requestCoords;
    const deepLink = Platform.select({
      ios:     `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`,
      android: `google.navigation:q=${latitude},${longitude}&mode=d`,
    });
    const fallback = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    Linking.canOpenURL(deepLink)
      .then((supported) => Linking.openURL(supported ? deepLink : fallback))
      .catch(() => Linking.openURL(fallback));
  };

  const statusInfo  = getStatusInfo(requestDetail?.status);
  const urgencyInfo = getUrgency(requestDetail?.urgencyLevel);
  const distance    = requestCoords
    ? haversineDistance(
        userLocation.latitude, userLocation.longitude,
        requestCoords.latitude, requestCoords.longitude,
      )
    : null;

  return (
    <View style={styles.container}>
      {/* ── Bản đồ ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsCompass
        showsTraffic={navigating}
        initialRegion={{ ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.teamMarkerWrap}>
            <View style={styles.teamMarkerPulse} />
            <View style={styles.teamMarkerCore}>
              <Ionicons name="navigate" size={14} color="#FFF" />
            </View>
          </View>
        </Marker>

        {requestCoords && (
          <Marker coordinate={requestCoords} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.markerWrap}>
              <View style={[styles.markerPin, { backgroundColor: urgencyInfo.color }]}>
                <Ionicons name="alert" size={16} color="#FFF" />
              </View>
              <View style={[styles.markerTail, { borderTopColor: urgencyInfo.color }]} />
            </View>
          </Marker>
        )}

        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2E91FF"
            strokeWidth={5}
            lineJoin="round"
            lineCap="round"
          />
        )}
      </MapView>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#2F3542" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Chi tiết nhiệm vụ</Text>
          <Text style={styles.headerSub}>
            #{requestDetail?.requestCode || requestDetail?._id?.slice(-8)?.toUpperCase()}
          </Text>
        </View>
        {navigating && (
          <View style={styles.trackingBadge}>
            <View style={[styles.trackingDot, { backgroundColor: tracking ? '#27AE60' : '#A4B0BE' }]} />
            <Text style={styles.trackingText}>{tracking ? 'Đang theo dõi' : 'GPS...'}</Text>
          </View>
        )}
      </View>

      {/* ── Card chi tiết ── */}
      <View style={[styles.detailCard, { bottom: insets.bottom + 16 }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 340 }}
        >
          {/* Badges */}
          <View style={styles.cardHeader}>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                <Ionicons name={statusInfo.icon} size={13} color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
              <View style={[styles.urgencyBadge, { backgroundColor: urgencyInfo.color + '20' }]}>
                <Text style={[styles.urgencyText, { color: urgencyInfo.color }]}>{urgencyInfo.label}</Text>
              </View>
            </View>
            <Text style={styles.requestCode}>
              #{requestDetail?.requestCode || requestDetail?._id?.slice(-8)?.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {requestDetail?.description || 'Không có mô tả'}
          </Text>

          {/* Meta */}
          <View style={styles.metaInfo}>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={13} color="#A4B0BE" />
              <Text style={styles.metaText}>{formatDateTime(requestDetail?.createdAt)}</Text>
            </View>
            {distance !== null && (
              <View style={styles.metaRow}>
                <Ionicons name="navigate-outline" size={13} color="#FF4757" />
                <Text style={[styles.metaText, { color: '#FF4757', fontWeight: '600' }]}>
                  Cách vị trí hiện tại {formatDistance(distance)}
                </Text>
              </View>
            )}
            {requestDetail?.userId?.phone && (
              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={13} color="#A4B0BE" />
                <Text style={styles.metaText}>{requestDetail.userId.phone}</Text>
              </View>
            )}
          </View>

          {/* Nút chỉ đường */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.navButton, navigating && styles.navButtonActive]}
              onPress={navigating ? handleCancelNavigate : handleNavigate}
              disabled={!requestCoords || loadingLocation}
            >
              <Ionicons name={navigating ? 'close' : 'navigate'} size={18} color="#FFF" />
              <Text style={styles.navButtonText}>{navigating ? 'Huỷ' : 'Chỉ đường'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gmapsButton}
              onPress={handleOpenGoogleMaps}
              disabled={!requestCoords}
            >
              <Ionicons name="map" size={18} color="#2E91FF" />
              <Text style={styles.gmapsButtonText}>Google Maps</Text>
            </TouchableOpacity>
          </View>

          {/* Nút cập nhật trạng thái */}
          {!isTerminal && (
            <>
              <TouchableOpacity
                style={[
                  styles.actionFullBtn, styles.actionBtnInProgress,
                  (statusUpdating || requestDetail?.status === 'IN_PROGRESS') && styles.actionBtnDisabled,
                ]}
                onPress={markInProgress}
                disabled={statusUpdating || requestDetail?.status === 'IN_PROGRESS'}
              >
                {statusUpdating
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Ionicons name="construct-outline" size={20} color="#FFF" />
                }
                <Text style={styles.actionFullBtnText}>
                  {requestDetail?.status === 'IN_PROGRESS' ? '✓ Đang cứu hộ' : 'Đánh dấu đang cứu hộ'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionFullBtn, styles.actionBtnComplete, statusUpdating && styles.actionBtnDisabled]}
                onPress={openCompleteForm}
                disabled={statusUpdating}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                <Text style={styles.actionFullBtnText}>Hoàn thành cứu hộ</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      {/* ══ Modal: Form hoàn thành ══ */}
      <Modal visible={showCompleteForm} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.confirmOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top + 40}
          enabled
        >
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={36} color="#27AE60" />
            </View>
            <Text style={styles.confirmTitle}>Hoàn thành cứu hộ</Text>
            <Text style={styles.confirmDesc}>Thêm ảnh minh chứng và lý do (tuỳ chọn)</Text>
            <ScrollView
              style={{ maxHeight: 360, width: '100%' }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <Text style={[styles.formLabel, { marginTop: 6 }]}>Ảnh minh chứng</Text>
              {!evidenceImageUri ? (
                <View style={styles.imgPickerRow}>
                  <TouchableOpacity
                    style={styles.imgPickerBtn}
                    onPress={takeEvidencePhoto}
                    disabled={uploadingEvidence}
                  >
                    <Ionicons name="camera-outline" size={22} color="#2563EB" />
                    <Text style={styles.imgPickerText}>Chụp ảnh</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.imgPickerBtn}
                    onPress={pickEvidenceFromLibrary}
                    disabled={uploadingEvidence}
                  >
                    <Ionicons name="images-outline" size={22} color="#2563EB" />
                    <Text style={styles.imgPickerText}>Thư viện</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imgPreviewWrap}>
                  <Image source={{ uri: evidenceImageUri }} style={styles.imgPreview} />
                  {uploadingEvidence ? (
                    <View style={styles.imgOverlay}>
                      <ActivityIndicator size="small" color="#FFF" />
                      <Text style={styles.imgOverlayText}>Đang tải lên...</Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.imgRemoveBtn} onPress={removeEvidenceImage}>
                        <Ionicons name="close-circle" size={26} color="#E74C3C" />
                      </TouchableOpacity>
                      {evidenceImageUrl ? (
                        <View style={styles.imgDoneBadge}>
                          <Ionicons name="checkmark-circle" size={13} color="#27AE60" />
                          <Text style={styles.imgDoneText}>Đã tải lên</Text>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              )}

              <Text style={[styles.formLabel, { marginTop: 12 }]}>Lý do (tuỳ chọn)</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Nhập ghi chú hoặc lý do hoàn thành..."
                placeholderTextColor="#94A3B8"
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit
              />
            </ScrollView>

            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnCancel]}
                onPress={() => {
                  setShowCompleteForm(false);
                  setEvidenceImageUri(null);
                  setEvidenceImageUrl('');
                  setCancelReason('');
                }}
                disabled={statusUpdating || uploadingEvidence}
              >
                <Text style={styles.sheetBtnText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnConfirm, uploadingEvidence && { opacity: 0.6 }]}
                onPress={() => {
                  Keyboard.dismiss();
                  if (!evidenceImageUrl?.trim()) {
                    setShowErrorModal(true);
                    return;
                  }
                  setShowCompleteForm(false);
                  setShowConfirmModal(true);
                }}
                disabled={statusUpdating || uploadingEvidence}
              >
                <Text style={styles.sheetBtnText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══ Modal: Xác nhận lần cuối ══ */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="help-circle-outline" size={36} color="#27AE60" />
            </View>
            <Text style={styles.confirmTitle}>Xác nhận hoàn thành</Text>
            <Text style={styles.confirmDesc}>
              Bạn chắc chắn hoàn thành cứu hộ cho yêu cầu này?
            </Text>
            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnCancel]}
                onPress={() => {
                  setShowConfirmModal(false);
                  setShowCompleteForm(true);
                }}
                disabled={statusUpdating}
              >
                <Text style={styles.sheetBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnConfirm]}
                onPress={confirmCompletion}
                disabled={statusUpdating}
              >
                {statusUpdating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.sheetBtnText}>Xác nhận</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ Modal: Thông báo thành công ══ */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={36} color="#27AE60" />
            </View>
            <Text style={styles.confirmTitle}>Đã cập nhật</Text>
            <Text style={styles.confirmDesc}>Trạng thái yêu cầu đã chuyển sang Hoàn thành.</Text>
            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnConfirm]}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.sheetBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ Modal: Lỗi thiếu ảnh minh chứng ══ */}
      <Modal visible={showErrorModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="alert-circle-outline" size={36} color="#E74C3C" />
            </View>
            <Text style={styles.confirmTitle}>Thiếu ảnh minh chứng</Text>
            <Text style={styles.confirmDesc}>
              Vui lòng thêm ảnh minh chứng trước khi xác nhận hoàn thành.
            </Text>
            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnConfirm]}
                onPress={() => setShowErrorModal(false)}
              >
                <Text style={styles.sheetBtnText}>Đã hiểu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Loading overlay ── */}
      {(loadingLocation || loadingDetail) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2E91FF" />
          <Text style={styles.loadingText}>
            {loadingLocation ? 'Đang lấy vị trí...' : 'Đang tải chi tiết...'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F1F2F6',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  headerInfo:   { flex: 1 },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#2F3542' },
  headerSub:    { fontSize: 12, color: '#A4B0BE', marginTop: 1 },
  trackingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(39,174,96,0.12)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
  },
  trackingDot:  { width: 7, height: 7, borderRadius: 4 },
  trackingText: { fontSize: 12, fontWeight: '600', color: '#27AE60' },

  // Detail card
  detailCard: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: '#FFF', borderRadius: 20, padding: 18,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  badgeRow:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  statusText:   { fontSize: 12, fontWeight: '600' },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  urgencyText:  { fontSize: 12, fontWeight: '600' },
  requestCode:  { fontSize: 12, color: '#A4B0BE', fontWeight: '600' },
  description:  { fontSize: 15, color: '#2F3542', lineHeight: 22, marginBottom: 12 },
  metaInfo:     { gap: 6, marginBottom: 16 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText:     { fontSize: 13, color: '#A4B0BE' },

  // Nav buttons
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 2 },
  navButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7,
    backgroundColor: '#2E91FF', padding: 14, borderRadius: 12,
  },
  navButtonActive: { backgroundColor: '#E74C3C' },
  navButtonText:   { color: '#FFF', fontWeight: '700', fontSize: 14 },
  gmapsButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7,
    backgroundColor: '#FFF', padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#2E91FF',
  },
  gmapsButtonText: { color: '#2E91FF', fontWeight: '700', fontSize: 14 },

  // Action buttons
  actionFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 12, marginTop: 10,
  },
  actionBtnInProgress: { backgroundColor: '#2E91FF' },
  actionBtnComplete:   { backgroundColor: '#27AE60' },
  actionBtnDisabled:   { opacity: 0.55 },
  actionFullBtnText:   { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.88)',
    justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { marginTop: 14, fontSize: 14, color: '#7F8C8D' },

  // Markers
  teamMarkerWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  teamMarkerPulse: {
    position: 'absolute', width: 44, height: 44,
    borderRadius: 22, backgroundColor: 'rgba(46,145,255,0.2)',
  },
  teamMarkerCore: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#2E91FF',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF',
  },
  markerWrap: { alignItems: 'center' },
  markerPin: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF',
  },
  markerTail: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },

  // Modal overlay + box
  confirmOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  confirmBox: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center',
    alignSelf: 'stretch',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 24 },
      android: { elevation: 12 },
    }),
  },
  confirmIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  confirmDesc:  { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 4 },

  // Form
  formLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 10 },

  // Image picker buttons
  imgPickerRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  imgPickerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#EFF6FF', paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  imgPickerText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },

  // Image preview
  imgPreviewWrap: {
    height: 170, borderRadius: 14, overflow: 'hidden', marginBottom: 4,
  },
  imgPreview: { width: '100%', height: '100%' },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  imgOverlayText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  imgRemoveBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#FFF', borderRadius: 13,
  },
  imgDoneBadge: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  imgDoneText: { fontSize: 11, fontWeight: '700', color: '#27AE60' },

  // Reason input
  reasonInput: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0F172A', minHeight: 80,
    backgroundColor: '#F8FAFC',
  },

  // Sheet buttons
  sheetButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  sheetBtn:     { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  sheetBtnCancel:  { backgroundColor: '#C0392B' },
  sheetBtnConfirm: { backgroundColor: '#27AE60' },
  sheetBtnText:    { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

export default AssignedTaskDetailScreen;
