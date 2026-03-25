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
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const STATUS_OPTIONS = [
  { value: 'AVAILABLE',  label: 'Sẵn sàng',          color: '#27AE60' },
  { value: 'BUSY',       label: 'Bận',                color: '#F39C12' },
  { value: 'OFFLINE',    label: 'Offline',            color: '#A4B0BE' },
  { value: 'ON_MISSION', label: 'Đang làm nhiệm vụ', color: '#2E91FF' },
];

const VEHICLE_STATUS_MAP = {
  AVAILABLE:   { label: 'Sẵn sàng',     color: '#27AE60', icon: 'checkmark-circle' },
  IN_USE:      { label: 'Đang sử dụng', color: '#2E91FF', icon: 'car' },
  MAINTENANCE: { label: 'Bảo trì',      color: '#E74C3C', icon: 'construct' },
};

const getVehicleStatus = (status) =>
  VEHICLE_STATUS_MAP[status] || { label: status || '—', color: '#A4B0BE', icon: 'help-circle' };

const getStatusInfo = (statusValue) =>
  STATUS_OPTIONS.find(opt => opt.value === statusValue) || STATUS_OPTIONS[0];

const UpdateTeam = ({ route, navigation }) => {
  const { teamId, team } = route.params;
  const { getAuthHeaders } = useAuth();
  const insets = useSafeAreaInsets();

  const [teamName, setTeamName] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [originalStatus, setOriginalStatus] = useState('AVAILABLE');
  const [leaderId, setLeaderId] = useState('');
  const [members, setMembers] = useState([]);       // array of user objects
  const [vehicles, setVehicles] = useState([]);     // array of vehicle objects

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [allUsers, setAllUsers] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchTeamData = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/rescue-teams/${teamId || team?._id || team?.id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Lỗi ${response.status}`);
      const data = await response.json();
      const d = data?.data ?? data;

      setTeamName(d.teamName || '');
      setStatus(d.status || 'AVAILABLE');
      setOriginalStatus(d.status || 'AVAILABLE');
      setLeaderId(
        typeof d.leaderId === 'object' ? d.leaderId?._id || '' : d.leaderId || ''
      );
      setMembers(Array.isArray(d.members) ? d.members : []);
      setVehicles(Array.isArray(d.vehicles) ? d.vehicles : []);
    } catch (err) {
      setError(err.message || 'Không thể tải thông tin đội.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : data.data || data.users || [];
        const rescueUsers = (list || []).filter(u => (u.role || u.userRole) === 'RESCUE_TEAM');
        setAllUsers(rescueUsers);
      }
    } catch (err) {
      console.error('Lỗi tải users:', err);
    }
  };

  const fetchAllVehicles = async () => {
    try {
      const response = await fetch(`${API_URL}/vehicles`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setAllVehicles(Array.isArray(data) ? data : data.data || data.vehicles || []);
      }
    } catch (err) {
      console.error('Lỗi tải vehicles:', err);
    }
  };

  useEffect(() => {
    fetchTeamData();
    fetchAllUsers();
    fetchAllVehicles();
  }, [teamId]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getId = (item) =>
    typeof item === 'object' ? item._id || item.id : item;

  const getLeaderName = () => {
    if (!leaderId) return 'Chọn trưởng đội';
    const found = allUsers.find(u => u._id === leaderId);
    return found ? found.fullName || found.username || found.phone : leaderId;
  };

  const isMember = (user) => members.some(m => getId(m) === getId(user));
  const isVehicle = (vehicle) => vehicles.some(v => getId(v) === getId(vehicle));

  const toggleMember = (user) => {
    if (isMember(user)) {
      setMembers(prev => prev.filter(m => getId(m) !== getId(user)));
    } else {
      setMembers(prev => [...prev, user]);
    }
  };

  const toggleVehicle = (vehicle) => {
    if (isVehicle(vehicle)) {
      setVehicles(prev => prev.filter(v => getId(v) !== getId(vehicle)));
    } else {
      setVehicles(prev => [...prev, vehicle]);
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên đội.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        teamName: teamName.trim(),
        leaderId: leaderId || null,
        members: members.map(getId),
        vehicles: vehicles.map(getId),
      };

      const response = await fetch(`${API_URL}/rescue-teams/${teamId || team?._id || team?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Lỗi ${response.status}`);
      }

      // Cập nhật trạng thái nếu API riêng yêu cầu (AVAILABLE/OFFLINE)
      if (status && ['AVAILABLE', 'OFFLINE'].includes(status) && status !== originalStatus) {
        const statusRes = await fetch(`${API_URL}/rescue-teams/${teamId || team?._id || team?.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ status }),
        });
        if (!statusRes.ok) {
          const sErr = await statusRes.json().catch(() => ({}));
          throw new Error(sErr.message || `Lỗi ${statusRes.status} khi cập nhật trạng thái`);
        }
      }

      Alert.alert('Thành công', 'Cập nhật đội thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      setError(err.message || 'Không thể cập nhật đội.');
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật đội.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render items ─────────────────────────────────────────────────────────

  const renderStatusOption = ({ item }) => (
    <TouchableOpacity
      style={[styles.option, { backgroundColor: status === item.value ? item.color + '20' : '#FFFFFF' }]}
      onPress={() => { setStatus(item.value); setShowStatusModal(false); }}
    >
      <View style={[styles.statusDot, { backgroundColor: item.color }]} />
      <Text style={styles.optionText}>{item.label}</Text>
      {status === item.value && <Ionicons name="checkmark" size={20} color={item.color} />}
    </TouchableOpacity>
  );

  const renderLeaderOption = ({ item }) => {
    const selected = leaderId === item._id;
    return (
      <TouchableOpacity
        style={[styles.option, selected && styles.optionSelected]}
        onPress={() => { setLeaderId(item._id); setShowLeaderModal(false); }}
      >
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color={selected ? '#FFFFFF' : '#2C3E50'} />
        </View>
        <View style={styles.optionInfo}>
          <Text style={styles.optionTitle}>{item.fullName || item.username || 'Người dùng'}</Text>
          {item.phone && <Text style={styles.optionSub}>{item.phone}</Text>}
        </View>
        {selected && <Ionicons name="checkmark-circle" size={20} color="#2E91FF" />}
      </TouchableOpacity>
    );
  };

  const renderMemberOption = ({ item }) => {
    const selected = isMember(item);
    const isLeader = item._id === leaderId;
    return (
      <TouchableOpacity
        style={[styles.option, selected && styles.optionSelected]}
        onPress={() => toggleMember(item)}
      >
        <View style={[styles.avatar, selected && styles.avatarActive]}>
          <Ionicons name="person" size={18} color={selected ? '#FFFFFF' : '#2C3E50'} />
        </View>
        <View style={styles.optionInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.optionTitle}>{item.fullName || item.username || 'Người dùng'}</Text>
            {isLeader && (
              <View style={styles.leaderTag}>
                <Text style={styles.leaderTagText}>Trưởng đội</Text>
              </View>
            )}
          </View>
          {item.phone && <Text style={styles.optionSub}>{item.phone}</Text>}
        </View>
        {selected
          ? <Ionicons name="checkmark-circle" size={20} color="#2E91FF" />
          : <Ionicons name="add-circle-outline" size={20} color="#A4B0BE" />
        }
      </TouchableOpacity>
    );
  };

  const renderVehicleOption = ({ item }) => {
    const selected = isVehicle(item);
    const vs = getVehicleStatus(item.status);
    return (
      <TouchableOpacity
        style={[styles.option, selected && styles.optionSelected]}
        onPress={() => toggleVehicle(item)}
      >
        <View style={[styles.avatar, selected && styles.avatarActive]}>
          <Ionicons name="car" size={18} color={selected ? '#FFFFFF' : '#2C3E50'} />
        </View>
        <View style={styles.optionInfo}>
          <View style={styles.vehicleNameRow}>
            <Text style={styles.optionTitle} numberOfLines={1}>
              {item.name || item.model || 'Phương tiện'}
            </Text>
            <View style={[styles.vStatusBadge, { backgroundColor: vs.color + '20' }]}>
              <Ionicons name={vs.icon} size={10} color={vs.color} />
              <Text style={[styles.vStatusText, { color: vs.color }]}>{vs.label}</Text>
            </View>
          </View>
          {(item.licensePlate || item.plateNumber) && (
            <Text style={styles.optionSub}>{item.licensePlate || item.plateNumber}</Text>
          )}
          {(item.type || item.category) && (
            <Text style={styles.vehicleType}>{item.type || item.category}</Text>
          )}
        </View>
        {selected
          ? <Ionicons name="checkmark-circle" size={20} color="#2E91FF" />
          : <Ionicons name="add-circle-outline" size={20} color="#A4B0BE" />
        }
      </TouchableOpacity>
    );
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

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

  const currentStatus = getStatusInfo(status);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cập nhật đội cứu hộ</Text>
        </View>

        <View style={styles.formContainer}>

          {/* Tên đội */}
          <Text style={styles.label}>Tên đội *</Text>
          <TextInput
            style={styles.input}
            value={teamName}
            onChangeText={setTeamName}
            placeholder="Nhập tên đội"
            placeholderTextColor="#A4B0BE"
          />

          {/* Trạng thái */}
          <Text style={styles.label}>Trạng thái</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowStatusModal(true)}>
            <View style={[styles.statusDot, { backgroundColor: currentStatus.color }]} />
            <Text style={styles.dropdownText}>{currentStatus.label}</Text>
            <Ionicons name="chevron-down" size={20} color="#7F8C8D" />
          </TouchableOpacity>

          {/* Trưởng đội */}
          <Text style={styles.label}>Trưởng đội</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowLeaderModal(true)}>
            <Ionicons name="person-outline" size={18} color="#7F8C8D" style={styles.dropdownIcon} />
            <Text style={[styles.dropdownText, !leaderId && styles.placeholder]}>
              {getLeaderName()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#7F8C8D" />
          </TouchableOpacity>

          {/* Thành viên */}
          <Text style={styles.label}>Thành viên</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowMemberModal(true)}>
            <Ionicons name="people-outline" size={18} color="#7F8C8D" style={styles.dropdownIcon} />
            <Text style={[styles.dropdownText, members.length === 0 && styles.placeholder]}>
              {members.length === 0
                ? 'Chọn thành viên'
                : `${members.length} thành viên`}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#7F8C8D" />
          </TouchableOpacity>

          {/* Chip thành viên đã chọn */}
          {members.length > 0 && (
            <View style={styles.chipContainer}>
              {members.map((m) => (
                <TouchableOpacity
                  key={getId(m)}
                  style={styles.chip}
                  onPress={() => toggleMember(m)}
                >
                  <Text style={styles.chipText}>
                    {typeof m === 'object' ? m.fullName || m.username || 'Thành viên' : m}
                  </Text>
                  <Ionicons name="close" size={13} color="#2E91FF" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Phương tiện */}
          <Text style={styles.label}>Phương tiện</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowVehicleModal(true)}>
            <Ionicons name="car-outline" size={18} color="#7F8C8D" style={styles.dropdownIcon} />
            <Text style={[styles.dropdownText, vehicles.length === 0 && styles.placeholder]}>
              {vehicles.length === 0
                ? 'Chọn phương tiện'
                : `${vehicles.length} phương tiện`}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#7F8C8D" />
          </TouchableOpacity>

          {/* Chip phương tiện đã chọn */}
          {vehicles.length > 0 && (
            <View style={styles.chipContainer}>
              {vehicles.map((v) => {
                const name = typeof v === 'object'
                  ? (v.name || v.model || 'Phương tiện') + (v.licensePlate || v.plateNumber ? ` (${v.licensePlate || v.plateNumber})` : '')
                  : v;
                return (
                  <TouchableOpacity key={getId(v)} style={styles.chip} onPress={() => toggleVehicle(v)}>
                    <Text style={styles.chipText}>{name}</Text>
                    <Ionicons name="close" size={13} color="#2E91FF" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.submitButtonText}>Cập nhật đội</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Modal: Trạng thái ── */}
        <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Chọn trạng thái</Text>
              <FlatList data={STATUS_OPTIONS} renderItem={renderStatusOption} keyExtractor={i => i.value} />
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowStatusModal(false)}>
                <Text style={styles.modalCloseText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Modal: Trưởng đội ── */}
        <Modal visible={showLeaderModal} transparent animationType="slide" onRequestClose={() => setShowLeaderModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Chọn trưởng đội</Text>
              <FlatList
                data={allUsers}
                renderItem={renderLeaderOption}
                keyExtractor={i => i._id || i.id}
                style={styles.listScroll}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowLeaderModal(false)}>
                <Text style={styles.modalCloseText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Modal: Thành viên ── */}
        <Modal visible={showMemberModal} transparent animationType="slide" onRequestClose={() => setShowMemberModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn thành viên</Text>
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>{members.length} đã chọn</Text>
                </View>
              </View>
              <FlatList
                data={allUsers}
                renderItem={renderMemberOption}
                keyExtractor={i => i._id || i.id}
                style={styles.listScroll}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowMemberModal(false)}>
                <Text style={styles.modalCloseText}>Xong</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Modal: Phương tiện ── */}
        <Modal visible={showVehicleModal} transparent animationType="slide" onRequestClose={() => setShowVehicleModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn phương tiện</Text>
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>{vehicles.length} đã chọn</Text>
                </View>
              </View>
              <FlatList
                data={allVehicles}
                renderItem={renderVehicleOption}
                keyExtractor={i => i._id || i.id}
                style={styles.listScroll}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowVehicleModal(false)}>
                <Text style={styles.modalCloseText}>Xong</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#ECF0F1',
  },
  backButton: { padding: 8, marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#2C3E50' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#7F8C8D' },

  formContainer: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#2C3E50', marginBottom: 8, marginTop: 20 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECF0F1',
    borderRadius: 10, padding: 14, fontSize: 16, color: '#2C3E50',
  },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#ECF0F1', borderRadius: 10, padding: 14,
  },
  dropdownIcon: { marginRight: 10 },
  dropdownText: { flex: 1, fontSize: 15, color: '#2C3E50', marginRight: 8 },
  placeholder: { color: '#A4B0BE' },
  statusDot: { width: 13, height: 13, borderRadius: 7, marginRight: 10 },

  // Chips
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EBF4FF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { fontSize: 13, color: '#2E91FF', fontWeight: '500' },

  submitButton: { backgroundColor: '#2E91FF', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 32 },
  submitButtonDisabled: { backgroundColor: '#BDC3C7' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#E74C3C', fontSize: 14, marginTop: 10, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '90%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#2C3E50' },
  selectedBadge: { backgroundColor: '#EBF4FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  selectedBadgeText: { fontSize: 13, color: '#2E91FF', fontWeight: '600' },
  modalCloseButton: { backgroundColor: '#2E91FF', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  modalCloseText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  listScroll: { maxHeight: 360 },
  separator: { height: 1, backgroundColor: '#F1F2F6' },

  // Options
  option: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10 },
  optionSelected: { backgroundColor: '#EBF4FF' },
  optionText: { fontSize: 15, color: '#2C3E50', flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECF0F1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarActive: { backgroundColor: '#2E91FF' },
  optionInfo: { flex: 1 },
  optionTitle: { fontSize: 15, color: '#2C3E50', fontWeight: '500' },
  optionSub: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },

  // Leader tag
  leaderTag: { backgroundColor: '#FFF3CD', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  leaderTagText: { fontSize: 11, color: '#F39C12', fontWeight: '600' },

  // Vehicle
  vehicleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  vStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  vStatusText: { fontSize: 11, fontWeight: '600' },
  vehicleType: { fontSize: 11, color: '#95A5A6', marginTop: 2 },
});

export default UpdateTeam;
