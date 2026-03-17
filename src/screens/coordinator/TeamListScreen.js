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
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const addressCache = {};

const extractLatLng = (loc) => {
  if (!loc) return null;
  if (loc.coordinates?.length === 2) {
    return { latitude: loc.coordinates[1], longitude: loc.coordinates[0] };
  }
  if (loc.latitude && loc.longitude) {
    return { latitude: Number(loc.latitude), longitude: Number(loc.longitude) };
  }
  return null;
};

const formatAddress = (geo) => {
  if (!geo) return null;
  const parts = [geo.streetNumber, geo.street, geo.district, geo.subregion, geo.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

const TeamLocation = ({ location }) => {
  const [address, setAddress] = useState(null);
  const [loadingAddr, setLoadingAddr] = useState(false);

  useEffect(() => {
    const coords = extractLatLng(location);
    if (!coords) return;

    const cacheKey = `${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`;

    if (addressCache[cacheKey]) {
      setAddress(addressCache[cacheKey]);
      return;
    }

    setLoadingAddr(true);
    Location.reverseGeocodeAsync(coords)
      .then((results) => {
        if (results?.length > 0) {
          const addr = formatAddress(results[0]);
          if (addr) {
            addressCache[cacheKey] = addr;
            setAddress(addr);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAddr(false));
  }, [location]);

  const coords = extractLatLng(location);
  if (!location && !coords) return null;

  const fallback = typeof location === 'string'
    ? location
    : coords
      ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
      : '—';

  return (
    <View style={styles.detailRow}>
      <Ionicons name="location-outline" size={14} color="#747D8C" />
      {loadingAddr ? (
        <ActivityIndicator size="small" color="#A4B0BE" style={{ marginLeft: 4 }} />
      ) : (
        <Text style={styles.detailText} numberOfLines={1}>
          {address || fallback}
        </Text>
      )}
    </View>
  );
};

const TeamListScreen = ({ navigation }) => {
  const { getAuthHeaders } = useAuth();
  const insets = useSafeAreaInsets();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchTeams = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/rescue-teams`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Lỗi ${response.status}`);
      }

      const data = await response.json();
      const teamList = Array.isArray(data) ? data : data.data ?? data.teams ?? data.items ?? [];
      setTeams(teamList);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đội cứu hộ.');
      Alert.alert('Lỗi', 'Không thể tải danh sách đội cứu hộ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load lần đầu
  useEffect(() => {
    fetchTeams();
  }, []);

  // ✅ Tự động re-fetch khi quay lại từ TeamDetail hoặc UpdateTeam
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTeams();
    });
    return unsubscribe;
  }, [navigation, fetchTeams]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeams();
  };

  const handleTeamPress = (team) => {
    navigation.navigate('TeamDetail', { teamId: team._id || team.id, team });
  };

  const getTeamStatusInfo = (status) => {
    const statusMap = {
      AVAILABLE:  { label: 'Sẵn sàng',          color: '#27AE60', icon: 'checkmark-circle' },
      BUSY:       { label: 'Bận',                color: '#F39C12', icon: 'time' },
      OFFLINE:    { label: 'Offline',            color: '#95A5A6', icon: 'close-circle' },
      ON_MISSION: { label: 'Đang làm nhiệm vụ', color: '#3498DB', icon: 'car' },
    };
    return statusMap[status] || { label: status || '—', color: '#747D8C', icon: 'help-circle' };
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E91FF" />
          <Text style={styles.loadingText}>Đang tải danh sách đội cứu hộ...</Text>
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
        <Text style={styles.headerTitle}>Danh sách đội cứu hộ</Text>
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
            <TouchableOpacity style={styles.retryButton} onPress={fetchTeams}>
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : teams.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#A4B0BE" />
            <Text style={styles.emptyText}>Chưa có đội cứu hộ nào</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {teams.map((team) => {
              const statusInfo = getTeamStatusInfo(team.status);
              return (
                <TouchableOpacity
                  key={team._id || team.id}
                  style={styles.teamCard}
                  onPress={() => handleTeamPress(team)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName}>
                        {team.teamName || team.name || 'Chưa có tên'}
                      </Text>
                      <Text style={styles.teamCode}>
                        #{team.teamCode || team._id?.slice(-8)?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                      <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.teamDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="people-outline" size={14} color="#747D8C" />
                      <Text style={styles.detailText}>
                        {team.memberCount || team.members?.length || 0} thành viên
                      </Text>
                    </View>

                    {team.currentLocation && (
                      <TeamLocation location={team.currentLocation} />
                    )}

                    {team.specialization && (
                      <View style={styles.detailRow}>
                        <Ionicons name="medkit-outline" size={14} color="#747D8C" />
                        <Text style={styles.detailText}>{team.specialization}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.assignedText}>
                      Đã nhận: {team.assignedRequests || 0} yêu cầu
                    </Text>
                    <Text style={styles.completedText}>
                      Hoàn thành: {team.completedRequests || 0}
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
  teamCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F1F2F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 16, fontWeight: 'bold', color: '#2F3542', marginBottom: 4 },
  teamCode: { fontSize: 12, color: '#747D8C' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  teamDetails: { marginBottom: 12, gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: '#747D8C', flex: 1 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F1F2F6', paddingTop: 12,
  },
  assignedText: { fontSize: 12, color: '#2E91FF', fontWeight: '500' },
  completedText: { fontSize: 12, color: '#27AE60', fontWeight: '500' },
});

export default TeamListScreen;