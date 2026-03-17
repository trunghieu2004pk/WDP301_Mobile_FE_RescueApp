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
  Platform,
  Linking,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
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
  IN_PROGRESS: { label: 'Đang xử lý',    color: '#2E91FF', icon: 'sync-outline' },
  ON_THE_WAY:  { label: 'Đang đến',      color: '#3498DB', icon: 'boat-outline' },
  COMPLETED:   { label: 'Đã hoàn thành', color: '#27AE60', icon: 'checkmark-circle-outline' },
  CANCELLED:   { label: 'Đã hủy',        color: '#A4B0BE', icon: 'close-circle-outline' },
};

const URGENCY_MAP = {
  LOW:    { label: 'Thấp',       color: '#27AE60' },
  MEDIUM: { label: 'Trung bình', color: '#F39C12' },
  HIGH:   { label: 'Cao',        color: '#E74C3C' },
  URGENT: { label: 'Khẩn cấp',  color: '#FF4757' },
};

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
  const a = Math.sin(dLat / 2) ** 2 +
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

// ─── Decode Google encoded polyline ──────────────────────────────────────────
const decodePolyline = (encoded) => {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
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
  const watchRef   = useRef(null);  // GPS watcher
  const lastApiRef = useRef(0);     // throttle API calls
  const teamIdRef  = useRef(null);  // cache teamId

  const [userLocation, setUserLocation]         = useState(DEFAULT_LOCATION);
  const [locationLabel, setLocationLabel]       = useState('Mặc định – Quận 9');
  const [loadingLocation, setLoadingLocation]   = useState(false);
  const [requestDetail, setRequestDetail]       = useState(request);
  const [loadingDetail, setLoadingDetail]       = useState(!request);
  const [routeCoords, setRouteCoords]           = useState([]);
  const [navigating, setNavigating]             = useState(false);
  const [tracking, setTracking]                 = useState(false);
  const [statusUpdating, setStatusUpdating]     = useState(false);
  const [showStatusMenu, setShowStatusMenu]     = useState(false);

  const requestCoords = getRequestCoords(requestDetail);

  // ─── Lấy teamId từ GET /rescue-teams (filter theo leaderId) ───────────────
  const getTeamId = useCallback(async () => {
    if (teamIdRef.current) return teamIdRef.current;
    const res = await fetch(`${API_URL}/rescue-teams`, { method: 'GET', headers: getAuthHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.data ?? data.teams ?? [];
    const myTeam = list.find(t => (t.leaderId?._id || t.leaderId) === user?._id);
    const id = myTeam?._id || myTeam?.id || null;
    teamIdRef.current = id;
    return id;
  }, [user?._id]);

  // ─── Gửi vị trí lên PATCH /rescue-teams/{id}/location ────────────────────
  const uploadLocation = useCallback(async (coords) => {
    const now = Date.now();
    if (now - lastApiRef.current < 5000) return; // throttle 5 giây
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
  }, [getTeamId]);

  // ─── Bắt đầu theo dõi GPS liên tục ───────────────────────────────────────
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
      }
    );
  }, [uploadLocation]);

  const stopTracking = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    setTracking(false);
  }, []);

  // Dọn dẹp khi unmount
  useEffect(() => () => stopTracking(), []);

  // ─── Cập nhật tiến độ cứu hộ ─────────────────────────────────────────────
  const PROGRESS_STATUSES = [
    { key: 'IN_PROGRESS', label: 'Đang cứu hộ',      color: '#2E91FF', icon: 'construct-outline' },
    { key: 'COMPLETED',   label: 'Hoàn thành',        color: '#27AE60', icon: 'checkmark-circle-outline' },
  ];

  const updateStatus = useCallback(async (newStatus) => {
    const id = requestDetail?._id || requestDetail?.id;
    if (!id) return;
    setStatusUpdating(true);
    setShowStatusMenu(false);
    try {
      const response = await fetch(`${API_URL}/rescue-requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error(`Lỗi ${response.status}`);
      const data = await response.json();
      const updated = data?.data ?? data;
      setRequestDetail(prev => ({ ...prev, status: updated?.status || newStatus }));
      Alert.alert('✅ Thành công', `Đã cập nhật trạng thái: ${PROGRESS_STATUSES.find(s=>s.key===newStatus)?.label || newStatus}`);
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể cập nhật trạng thái');
    } finally {
      setStatusUpdating(false);
    }
  }, [requestDetail, getAuthHeaders]);

  // ─── GPS ──────────────────────────────────────────────────────────────────
  const initLocation = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
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

  // ─── Fetch request detail ─────────────────────────────────────────────────
  const fetchRequestDetail = useCallback(async () => {
    if (!request?._id && !request?.id) return;
    setLoadingDetail(true);
    try {
      const response = await fetch(`${API_URL}/rescue-requests/${request._id || request.id}`, {
        method: 'GET', headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Lỗi ${response.status}`);
      const data = await response.json();
      setRequestDetail(data?.data ?? data);
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể tải chi tiết yêu cầu');
    } finally { setLoadingDetail(false); }
  }, [request]);

  useEffect(() => {
    initLocation();
    if (!request) { Alert.alert('Lỗi', 'Không có thông tin yêu cầu'); navigation.goBack(); return; }
    if (!request.description || !request.location) fetchRequestDetail();
  }, []);

  // ─── Chỉ đường trong app (không cần API key) ──────────────────────────────
  // Dùng OSRM — open source routing, miễn phí, không cần key
  const handleNavigate = async () => {
    startTracking(); // bắt đầu theo dõi GPS + upload lên server
    if (!requestCoords) return;

    setNavigating(true);
    setRouteCoords([]);

    try {
      const { latitude: oLat, longitude: oLng } = userLocation;
      const { latitude: dLat, longitude: dLng } = requestCoords;

      // OSRM public API — driving route
      const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=polyline`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code === 'Ok' && data.routes?.length > 0) {
        const points = decodePolyline(data.routes[0].geometry);
        setRouteCoords(points);

        // Fit map bao quanh toàn bộ tuyến đường
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 120, right: 40, bottom: 320, left: 40 }, animated: true,
        });
      } else {
        // Fallback: vẽ đường thẳng
        setRouteCoords([userLocation, requestCoords]);
        mapRef.current?.fitToCoordinates([userLocation, requestCoords], {
          edgePadding: { top: 120, right: 40, bottom: 320, left: 40 }, animated: true,
        });
        Alert.alert('Lưu ý', 'Không tìm được tuyến đường, hiển thị đường thẳng.');
      }
    } catch {
      // Offline / lỗi → vẽ đường thẳng
      setRouteCoords([userLocation, requestCoords]);
      mapRef.current?.fitToCoordinates([userLocation, requestCoords], {
        edgePadding: { top: 120, right: 40, bottom: 320, left: 40 }, animated: true,
      });
    }
  };

  const handleCancelNavigate = () => {
    setNavigating(false);
    setRouteCoords([]);
    stopTracking();
  };

  // ─── Mở Google Maps ngoài app ─────────────────────────────────────────────
  const handleOpenGoogleMaps = () => {
    if (!requestCoords) return;
    const { latitude, longitude } = requestCoords;
    const url = Platform.select({
      ios: `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`,
      android: `google.navigation:q=${latitude},${longitude}&mode=d`,
    });
    const fallback = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;

    Linking.canOpenURL(url)
      .then((supported) => Linking.openURL(supported ? url : fallback))
      .catch(() => Linking.openURL(fallback));
  };

  const statusInfo  = getStatusInfo(requestDetail?.status);
  const urgencyInfo = getUrgency(requestDetail?.urgencyLevel);
  const distance    = requestCoords
    ? haversineDistance(userLocation.latitude, userLocation.longitude, requestCoords.latitude, requestCoords.longitude)
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
        {/* Vị trí người dùng */}
        <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.teamMarkerWrap}>
            <View style={styles.teamMarkerPulse} />
            <View style={styles.teamMarkerCore}>
              <Ionicons name="navigate" size={14} color="#FFF" />
            </View>
          </View>
        </Marker>

        {/* Vị trí yêu cầu */}
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

        {/* Polyline tuyến đường */}
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

        {/* Cập nhật tiến độ - chỉ hiển thị khi chưa hoàn thành */}
        {requestDetail?.status !== 'COMPLETED' && (
          <>
            <TouchableOpacity
              style={styles.progressBtn}
              onPress={() => setShowStatusMenu(v => !v)}
              disabled={statusUpdating}
            >
              {statusUpdating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="flag-outline" size={16} color="#FFF" />
              )}
              <Text style={styles.progressBtnText}>
                {statusUpdating ? 'Đang cập nhật...' : 'Cập nhật tiến độ'}
              </Text>
              <Ionicons name={showStatusMenu ? 'chevron-up' : 'chevron-down'} size={16} color="#FFF" />
            </TouchableOpacity>

            {/* Status menu */}
            {showStatusMenu && (
              <View style={styles.statusMenu}>
                {PROGRESS_STATUSES.map(s => (
                  <TouchableOpacity
                    key={s.key}
                    style={[
                      styles.statusMenuItem,
                      requestDetail?.status === s.key && styles.statusMenuItemActive,
                    ]}
                    onPress={() => updateStatus(s.key)}
                  >
                    <View style={[styles.statusMenuDot, { backgroundColor: s.color }]} />
                    <Ionicons name={s.icon} size={15} color={requestDetail?.status === s.key ? s.color : '#747D8C'} />
                    <Text style={[styles.statusMenuText, requestDetail?.status === s.key && { color: s.color, fontWeight: '700' }]}>
                      {s.label}
                    </Text>
                    {requestDetail?.status === s.key && (
                      <Ionicons name="checkmark" size={15} color={s.color} style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* Buttons - chỉ hiển thị khi chưa hoàn thành */}
        {requestDetail?.status !== 'COMPLETED' && (
          <View style={styles.buttonRow}>
            {/* Chỉ đường trong app */}
            <TouchableOpacity
              style={[styles.navButton, navigating && styles.navButtonActive]}
              onPress={navigating ? handleCancelNavigate : handleNavigate}
              disabled={!requestCoords || loadingLocation}
            >
              <Ionicons name={navigating ? 'close' : 'navigate'} size={18} color="#FFF" />
              <Text style={styles.navButtonText}>
                {navigating ? 'Huỷ' : 'Chỉ đường'}
              </Text>
            </TouchableOpacity>

            {/* Mở Google Maps */}
            <TouchableOpacity
              style={styles.gmapsButton}
              onPress={handleOpenGoogleMaps}
              disabled={!requestCoords}
            >
              <Ionicons name="map" size={18} color="#2E91FF" />
              <Text style={styles.gmapsButtonText}>Google Maps</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Loading overlay */}
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
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F1F2F6', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#2F3542' },
  headerSub: { fontSize: 12, color: '#A4B0BE', marginTop: 1 },
  cancelNavBtn: { backgroundColor: '#FF4757', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  cancelNavText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  trackingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(39,174,96,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  trackingDot: { width: 7, height: 7, borderRadius: 4 },
  trackingText: { fontSize: 12, fontWeight: '600', color: '#27AE60' },

  // Detail card
  detailCard: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: '#FFF', borderRadius: 20, padding: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  urgencyText: { fontSize: 12, fontWeight: '600' },
  requestCode: { fontSize: 12, color: '#A4B0BE', fontWeight: '600' },
  description: { fontSize: 15, color: '#2F3542', lineHeight: 22, marginBottom: 12 },
  metaInfo: { gap: 6, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText: { fontSize: 13, color: '#A4B0BE' },

  // Buttons
  buttonRow: { flexDirection: 'row', gap: 10 },
  navButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#2E91FF', padding: 14, borderRadius: 12,
  },
  navButtonActive: { backgroundColor: '#E74C3C' },
  navButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  gmapsButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#FFF', padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#2E91FF',
  },
  gmapsButtonText: { color: '#2E91FF', fontWeight: '700', fontSize: 14 },

  // Loading
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.88)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 14, fontSize: 14, color: '#7F8C8D' },

  // Markers
  teamMarkerWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  teamMarkerPulse: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(46,145,255,0.2)' },
  teamMarkerCore: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2E91FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  markerWrap: { alignItems: 'center' },
  markerPin: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  markerTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent' },

  // Progress update
  progressBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#7C3AED', padding: 13, borderRadius: 12, marginBottom: 10,
    justifyContent: 'center',
  },
  progressBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14, flex: 1, textAlign: 'center' },
  statusMenu: {
    backgroundColor: '#F8F9FA', borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  statusMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  statusMenuItemActive: { backgroundColor: '#EEF2FF' },
  statusMenuDot: { width: 8, height: 8, borderRadius: 4 },
  statusMenuText: { fontSize: 14, color: '#747D8C', flex: 1 },
});

export default AssignedTaskDetailScreen;