import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const RADIUS_OPTIONS = [1000, 3000, 5000, 10000];

const DEFAULT_LOCATION = {
  latitude: 10.8412,
  longitude: 106.7749,
};

const URGENCY_MAP = {
  LOW:    { label: 'Thấp',       color: '#27AE60' },
  MEDIUM: { label: 'Trung bình', color: '#F39C12' },
  HIGH:   { label: 'Cao',        color: '#E74C3C' },
  URGENT: { label: 'Khẩn cấp',  color: '#FF4757' },
};

// Các status không hiển thị trên bản đồ
const EXCLUDE_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);

const getUrgency = (level) =>
  URGENCY_MAP[level] || { label: level || '—', color: '#A4B0BE' };

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

const formatDistance = (meters) => {
  if (meters == null) return '—';
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
};

const getRequestCoords = (req) => {
  const lat = req.location?.coordinates?.[1] ?? req.latitude;
  const lng = req.location?.coordinates?.[0] ?? req.longitude;
  if (!lat || !lng) return null;
  return { latitude: Number(lat), longitude: Number(lng) };
};

const NearbyRequestsScreen = ({ route, navigation }) => {
  const { user, getAuthHeaders } = useAuth();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [userLocation, setUserLocation]       = useState(DEFAULT_LOCATION);
  const [locationLabel, setLocationLabel]     = useState('Mặc định – Quận 9');
  const [allRequests, setAllRequests]         = useState([]);
  const [filtered, setFiltered]               = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [radius, setRadius]                   = useState(3000);
  const [showList, setShowList]               = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const watchRef = useRef(null);

  const paramTeamId = route?.params?.teamId || null;

  const initLocation = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLabel('Mặc định – Quận 9');
        return;
      }
      const last = await Location.getLastKnownPositionAsync();
      if (last?.coords) {
        const coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
        setUserLocation(coords);
        setLocationLabel('Vị trí gần đây');
        mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 600);
      } else {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(coords);
        setLocationLabel('GPS thiết bị');
        mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 600);
      }
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 50 },
        (update) => {
          const coords = { latitude: update.coords.latitude, longitude: update.coords.longitude };
          setUserLocation((prev) => {
            if (!prev || Math.abs(prev.latitude - coords.latitude) > 1e-6 || Math.abs(prev.longitude - coords.longitude) > 1e-6) {
              mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 400);
            }
            return coords;
          });
          setLocationLabel('GPS thiết bị');
        }
      );
    } catch {
      setLocationLabel('Mặc định – Quận 9');
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  const resolveTeamId = useCallback(async () => {
    if (paramTeamId) return String(paramTeamId);
    const direct =
      user?.teamId ||
      user?.team?._id || user?.team?.id ||
      user?.rescueTeamId ||
      user?.rescueTeam?._id || user?.rescueTeam?.id ||
      user?.team_id ||
      null;
    if (direct) return String(direct);
    if (!user?._id) return null;
    const response = await fetch(`${API_URL}/rescue-teams`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    const list = Array.isArray(data) ? data : data.data ?? data.teams ?? [];
    const myTeam = list.find((t) => {
      const lid = t?.leaderId?._id || t?.leaderId?.id || t?.leaderId;
      return lid && String(lid) === String(user?._id || user?.id);
    });
    return myTeam?._id || myTeam?.id || null;
  }, [paramTeamId, user, getAuthHeaders]);

  const fetchAssignedRequests = useCallback(async () => {
    if (!userLocation) return;
    setLoadingRequests(true);
    try {
      const teamId = await resolveTeamId();
      if (!teamId) {
        setAllRequests([]);
        return;
      }
      const response = await fetch(`${API_URL}/rescue-requests/assigned-tasks?teamId=${teamId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Lỗi ${response.status}`);
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.data ?? data.tasks ?? [];
      const onlyInProgress = list.filter((r) => String(r?.status || '').toUpperCase() === 'IN_PROGRESS');
      setAllRequests(onlyInProgress);
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể tải danh sách yêu cầu.');
    } finally {
      setLoadingRequests(false);
    }
  }, [userLocation, resolveTeamId, getAuthHeaders]);

  useEffect(() => {
    initLocation();
    return () => {
      try { watchRef.current?.remove?.(); } catch {}
      watchRef.current = null;
    };
  }, []);
  useEffect(() => { fetchAssignedRequests(); }, [userLocation]);

  useEffect(() => {
    if (!userLocation || allRequests.length === 0) { setFiltered([]); return; }
    const withDistance = allRequests
      .map((req) => {
        const coords = getRequestCoords(req);
        if (!coords) return null;
        const distance = haversineDistance(
          userLocation.latitude, userLocation.longitude,
          coords.latitude, coords.longitude
        );
        return { ...req, distance, coords };
      })
      .filter(Boolean)
      .filter((req) => req.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    setFiltered(withDistance);

    if (withDistance.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(
        [userLocation, ...withDistance.map((r) => r.coords)],
        { edgePadding: { top: 120, right: 40, bottom: 240, left: 40 }, animated: true }
      );
    }
  }, [allRequests, userLocation, radius]);

  const focusRequest = (req) => {
    setSelectedRequest(req);
    setShowList(false);
    mapRef.current?.animateToRegion({ ...req.coords, latitudeDelta: 0.003, longitudeDelta: 0.003 }, 600);
  };

  const handleRefresh = () => {
    setAllRequests([]);
    setFiltered([]);
    setSelectedRequest(null);
    initLocation();
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsCompass
        showsUserLocation={false}
        showsTraffic={false}
        initialRegion={
          userLocation
            ? { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : { ...DEFAULT_LOCATION, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
      >
        {userLocation && (
          <Circle
            center={userLocation}
            radius={radius}
            strokeColor="rgba(255,71,87,0.4)"
            fillColor="rgba(255,71,87,0.07)"
            strokeWidth={2}
          />
        )}

        {userLocation && (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.teamMarkerWrap}>
              <View style={styles.teamMarkerPulse} />
              <View style={styles.teamMarkerCore}>
                <Ionicons name="navigate" size={16} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        )}

        {filtered.map((req) => {
          const urgency = getUrgency(req.urgencyLevel);
          const isSelected = selectedRequest?._id === req._id;
          return (
            <Marker
              key={req._id || req.id}
              coordinate={req.coords}
              onPress={() => focusRequest(req)}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.markerWrap}>
                <View style={[styles.markerPin, { backgroundColor: urgency.color }, isSelected && styles.markerPinSelected]}>
                  <Ionicons name="alert" size={isSelected ? 16 : 13} color="#FFF" />
                </View>
                <View style={[styles.markerTail, { borderTopColor: urgency.color }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#2F3542" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{'Yêu cầu cứu hộ gần đây'}</Text>
          <Text style={styles.headerSub}>
            {loadingRequests
              ? 'Đang quét yêu cầu...'
              : `${filtered.length} / ${allRequests.length} yêu cầu · ${radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}`}
          </Text>
        </View>
        {loadingRequests
          ? <ActivityIndicator size="small" color="#FF4757" />
          : <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
              <Ionicons name="refresh" size={20} color="#FF4757" />
            </TouchableOpacity>
        }
      </View>

      {/* ── Radius chips ── */}
      <View style={[styles.radiusBar, { top: insets.top + 68 }]}>
        {RADIUS_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.radiusChip, radius === r && styles.radiusChipActive]}
            onPress={() => setRadius(r)}
          >
            <Text style={[styles.radiusChipText, radius === r && styles.radiusChipTextActive]}>
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Location chip ── */}
      {userLocation && (
        <View style={[styles.locationChip, { top: insets.top + 108 }]}>
          <View style={[styles.locationDot, { backgroundColor: locationLabel.startsWith('GPS') ? '#27AE60' : '#F39C12' }]} />
          <Text style={styles.locationChipText}>{locationLabel}</Text>
        </View>
      )}

      {/* ── Selected card ── */}
      {selectedRequest && !showList && (
        <View style={[styles.selectedCard, { bottom: insets.bottom + 100 }]}>
          <View style={styles.selectedCardHeader}>
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgency(selectedRequest.urgencyLevel).color + '20' }]}>
              <Text style={[styles.urgencyText, { color: getUrgency(selectedRequest.urgencyLevel).color }]}>
                {getUrgency(selectedRequest.urgencyLevel).label}
              </Text>
            </View>
            <Text style={styles.selectedId}>
              {'#'}{selectedRequest.requestCode || selectedRequest._id?.slice(-6)?.toUpperCase()}
            </Text>
            <TouchableOpacity onPress={() => setSelectedRequest(null)}>
              <Ionicons name="close" size={20} color="#A4B0BE" />
            </TouchableOpacity>
          </View>
          <Text style={styles.selectedDesc} numberOfLines={2}>
            {selectedRequest.description || 'Không có mô tả'}
          </Text>
          <View style={styles.selectedMeta}>
            <Ionicons name="navigate-outline" size={13} color="#FF4757" />
            <Text style={[styles.selectedMetaText, { color: '#FF4757', fontWeight: '600' }]}>
              {'Cách vị trí hiện tại '}{formatDistance(selectedRequest.distance)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => navigation.navigate('AssignedTaskDetail', { request: selectedRequest })}
          >
            <Ionicons name="arrow-forward-circle" size={18} color="#FFF" />
            <Text style={styles.detailButtonText}>{'Xem chi tiết'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── List toggle ── */}
      <TouchableOpacity
        style={[styles.listToggleBtn, { bottom: insets.bottom + 40 }]}
        onPress={() => { setShowList(!showList); setSelectedRequest(null); }}
      >
        <Ionicons name={showList ? 'map' : 'list'} size={20} color="#FFF" />
        <Text style={styles.listToggleText}>
          {showList ? 'Xem bản đồ' : `Danh sách (${filtered.length})`}
        </Text>
      </TouchableOpacity>

      {/* ── List sheet ── */}
      {showList && (
        <View style={styles.listSheet}>
          <View style={styles.listHandle} />
          <Text style={styles.listTitle}>{filtered.length} yêu cầu · sắp xếp theo khoảng cách</Text>
          {filtered.length === 0 ? (
            <View style={styles.emptyList}>
              <Ionicons name="search-outline" size={40} color="#A4B0BE" />
              <Text style={styles.emptyText}>{'Không có yêu cầu trong bán kính này'}</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              >
                {filtered.map((req) => {
                  const urgency = getUrgency(req.urgencyLevel);
                  return (
                    <TouchableOpacity
                      key={req._id || req.id}
                      style={styles.listItem}
                      onPress={() => focusRequest(req)}
                    >
                      <View style={styles.distanceCol}>
                        <Text style={styles.distanceValue}>
                          {req.distance >= 1000 ? `${(req.distance / 1000).toFixed(1)}` : `${Math.round(req.distance)}`}
                        </Text>
                        <Text style={styles.distanceUnit}>{req.distance >= 1000 ? 'km' : 'm'}</Text>
                      </View>
                      <View style={[styles.distanceLine, { backgroundColor: urgency.color }]} />
                      <View style={styles.listItemInfo}>
                        <View style={styles.listItemHeader}>
                          <Text style={styles.listItemId}>{'#'}{req.requestCode || req._id?.slice(-6)?.toUpperCase()}</Text>
                          <View style={[styles.urgencyBadge, { backgroundColor: urgency.color + '20' }]}>
                            <Text style={[styles.urgencyText, { color: urgency.color }]}>{urgency.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.listItemDesc} numberOfLines={1}>
                          {req.description || 'Không có mô tả'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#A4B0BE" />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { ...StyleSheet.absoluteFillObject },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 15, color: '#7F8C8D', textAlign: 'center' },
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
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F1F2F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#2F3542' },
  headerSub: { fontSize: 12, color: '#7F8C8D', marginTop: 1 },
  refreshBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center' },
  radiusBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', gap: 8 },
  radiusChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: '#E9ECEF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  radiusChipActive: { backgroundColor: '#FF4757', borderColor: '#FF4757' },
  radiusChipText: { fontSize: 13, fontWeight: '600', color: '#7F8C8D' },
  radiusChipTextActive: { color: '#FFF' },
  locationChip: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  locationDot: { width: 8, height: 8, borderRadius: 4 },
  locationChipText: { fontSize: 11, color: '#7F8C8D' },
  teamMarkerWrap: { alignItems: 'center', justifyContent: 'center', width: 50, height: 50 },
  teamMarkerPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(46,145,255,0.2)' },
  teamMarkerCore: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#2E91FF',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: '#FFF',
    ...Platform.select({
      ios: { shadowColor: '#2E91FF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6 },
      android: { elevation: 5 },
    }),
  },
  markerWrap: { alignItems: 'center' },
  markerPin: {
    width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  markerPinSelected: { width: 38, height: 38, borderRadius: 19 },
  markerTail: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  selectedCard: {
    position: 'absolute', left: 16, right: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  selectedCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  selectedId: { flex: 1, fontSize: 14, fontWeight: '700', color: '#2F3542' },
  selectedDesc: { fontSize: 14, color: '#2F3542', lineHeight: 20, marginBottom: 8 },
  selectedMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  selectedMetaText: { fontSize: 13 },
  detailButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF4757', padding: 12, borderRadius: 10 },
  detailButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urgencyText: { fontSize: 12, fontWeight: '600' },
  listToggleBtn: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2F3542', paddingHorizontal: 20, paddingVertical: 13, borderRadius: 28,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  listToggleText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  listSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 12,
    height: '60%',
    flexDirection: 'column',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 10 },
    }),
  },
  listHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E9ECEF', alignSelf: 'center', marginBottom: 12 },
  listTitle: { fontSize: 13, fontWeight: '600', color: '#7F8C8D', marginBottom: 12 },
  emptyList: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: '#A4B0BE' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F2F6' },
  distanceCol: { width: 44, alignItems: 'center' },
  distanceValue: { fontSize: 15, fontWeight: '700', color: '#2F3542' },
  distanceUnit: { fontSize: 11, color: '#A4B0BE', marginTop: 1 },
  distanceLine: { width: 3, height: 40, borderRadius: 2 },
  listItemInfo: { flex: 1 },
  listItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  listItemId: { fontSize: 14, fontWeight: '700', color: '#2F3542' },
  listItemDesc: { fontSize: 13, color: '#7F8C8D' },
});

export default NearbyRequestsScreen;
