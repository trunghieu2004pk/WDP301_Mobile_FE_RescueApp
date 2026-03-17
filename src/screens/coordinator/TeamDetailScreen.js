import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const STATUS_MAP = {
  AVAILABLE:  { label: 'Sẵn sàng',          color: '#27AE60', icon: 'checkmark-circle-outline' },
  BUSY:       { label: 'Bận',                color: '#F39C12', icon: 'time-outline' },
  OFFLINE:    { label: 'Offline',            color: '#A4B0BE', icon: 'close-circle-outline' },
  ON_MISSION: { label: 'Đang làm nhiệm vụ', color: '#2E91FF', icon: 'boat-outline' },
};

const getStatusInfo = (status) =>
  STATUS_MAP[status] || { label: status || '—', color: '#747D8C', icon: 'help-circle-outline' };

const TeamDetailScreen = ({ route, navigation }) => {
  const { teamId, team } = route.params;
  const { getAuthHeaders } = useAuth();
  const insets = useSafeAreaInsets();

  const [teamData, setTeamData] = useState(team || null);
  const [loading, setLoading] = useState(!team);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchTeamDetail = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/rescue-teams/${teamId || team?._id || team?.id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Lỗi ${response.status}`);
      }

      const data = await response.json();
      setTeamData(data?.data ?? data);
    } catch (err) {
      setError(err.message || 'Không thể tải thông tin đội cứu hộ.');
      Alert.alert('Lỗi', 'Không thể tải thông tin đội cứu hộ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId]);

  // Load lần đầu
  useEffect(() => {
    fetchTeamDetail();
  }, []);

  // ✅ Tự động re-fetch khi quay lại từ UpdateTeam
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTeamDetail();
    });
    return unsubscribe;
  }, [navigation, fetchTeamDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeamDetail();
  };

  const renderMemberItem = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberAvatar}>
        <Ionicons name="person-outline" size={24} color="#2C3E50" />
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.fullName || 'Thành viên'}</Text>
        <Text style={styles.memberRole}>{item.role || 'Thành viên'}</Text>
        {item.phone && (
          <Text style={styles.memberPhone}>
            <Ionicons name="call-outline" size={12} color="#7F8C8D" />
            {' '}{item.phone}
          </Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E91FF" />
          <Text style={styles.loadingText}>Đang tải thông tin đội...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !teamData) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết đội cứu hộ</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>{error || 'Không tìm thấy thông tin đội'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTeamDetail}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusInfo(teamData.status);
  const members = teamData.members || [];

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đội cứu hộ</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('UpdateTeam', {
            teamId: teamId || teamData._id || teamData.id,
            team: teamData,
          })}
        >
          <Ionicons name="create-outline" size={24} color="#2E91FF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.teamCard}>
          <View style={styles.teamHeader}>
            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>{teamData.teamName || 'Unnamed Team'}</Text>
              <Text style={styles.teamCode}>
                #{teamData.teamCode || teamData._id?.slice(-8)?.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
              <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          <View style={styles.teamDetails}>
            {teamData.description && (
              <View style={styles.detailRow}>
                <Ionicons name="document-text-outline" size={16} color="#7F8C8D" />
                <Text style={styles.detailText}>{teamData.description}</Text>
              </View>
            )}
            {teamData.contactPhone && (
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={16} color="#7F8C8D" />
                <Text style={styles.detailText}>{teamData.contactPhone}</Text>
              </View>
            )}
            {teamData.email && (
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={16} color="#7F8C8D" />
                <Text style={styles.detailText}>{teamData.email}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={16} color="#7F8C8D" />
              <Text style={styles.detailText}>{members.length} thành viên</Text>
            </View>
          </View>
        </View>

        {members.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thành viên đội</Text>
            <FlatList
              data={members}
              renderItem={renderMemberItem}
              keyExtractor={(item, index) => item._id || item.id || `member-${index}`}
              scrollEnabled={false}
            />
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Ionicons name="people-outline" size={48} color="#BDC3C7" />
            <Text style={styles.emptyText}>Chưa có thành viên nào</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#ECF0F1',
  },
  backButton: { padding: 8 },
  editButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#2C3E50', flex: 1, marginLeft: 8 },
  headerRight: { width: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#7F8C8D' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { marginTop: 16, fontSize: 16, color: '#7F8C8D', textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: '#2E91FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '600' },
  teamCard: {
    backgroundColor: '#FFFFFF', margin: 16, borderRadius: 12, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  teamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 20, fontWeight: '700', color: '#2C3E50', marginBottom: 4 },
  teamCode: { fontSize: 14, color: '#7F8C8D' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginLeft: 12 },
  statusIcon: { marginRight: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  teamDetails: { marginTop: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailText: { marginLeft: 8, fontSize: 14, color: '#2C3E50', flex: 1 },
  section: { marginTop: 8, marginHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2C3E50', marginBottom: 16 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 16, borderRadius: 8, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 1,
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#ECF0F1',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: '#2C3E50', marginBottom: 2 },
  memberRole: { fontSize: 14, color: '#7F8C8D', marginBottom: 4 },
  memberPhone: { fontSize: 12, color: '#7F8C8D' },
  emptySection: {
    alignItems: 'center', justifyContent: 'center', padding: 40, margin: 16,
    backgroundColor: '#FFFFFF', borderRadius: 12,
  },
  emptyText: { marginTop: 16, fontSize: 16, color: '#BDC3C7', textAlign: 'center' },
});

export default TeamDetailScreen;