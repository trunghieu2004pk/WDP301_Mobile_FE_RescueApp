import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const STATUS_OPTIONS = [
  { value: 'AVAILABLE',   label: 'Sẵn sàng',     color: '#27AE60', icon: 'checkmark-circle' },
  { value: 'IN_USE',      label: 'Đang sử dụng', color: '#2E91FF', icon: 'car' },
  { value: 'MAINTENANCE', label: 'Bảo trì',      color: '#E74C3C', icon: 'construct' },
  { value: 'BROKEN',      label: 'Hỏng',         color: '#C0392B', icon: 'alert-circle' },
];

const getStatusInfo = (s) => STATUS_OPTIONS.find(x => x.value === (s || '').toUpperCase()) || { value: s, label: s || '—', color: '#A4B0BE', icon: 'help-circle' };

const VehicleListScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { getAuthHeaders } = useAuth();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [editModal, setEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('AVAILABLE');
  const [updating, setUpdating] = useState(false);

  const [notifyModal, setNotifyModal] = useState(false);
  const [notifyType, setNotifyType] = useState('success');
  const [notifyMessage, setNotifyMessage] = useState('');

  const fetchVehicles = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/vehicles`, { method: 'GET', headers: getAuthHeaders() });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Lỗi ${response.status}`);
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.data ?? data.vehicles ?? [];
      setVehicles(list);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách phương tiện.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  const openEdit = (v) => {
    setSelectedVehicle(v);
    setSelectedStatus((v?.status || 'AVAILABLE').toUpperCase());
    setEditModal(true);
  };

  const submitUpdate = async () => {
    if (!selectedVehicle) return;
    setUpdating(true);
    try {
      const id = selectedVehicle._id || selectedVehicle.id;
      const response = await fetch(`${API_URL}/vehicles/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `Lỗi ${response.status}`);
      }
      setEditModal(false);
      setNotifyType('success');
      setNotifyMessage('Cập nhật trạng thái phương tiện thành công.');
      setNotifyModal(true);
      fetchVehicles();
    } catch (err) {
      setNotifyType('error');
      setNotifyMessage(err.message || 'Không thể cập nhật trạng thái phương tiện.');
      setNotifyModal(true);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2E91FF" />
          <Text style={styles.loadingText}>Đang tải danh sách phương tiện...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2F3542" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danh sách phương tiện</Text>
        <TouchableOpacity style={styles.headerRight} onPress={onRefresh} disabled={refreshing}>
          {refreshing ? <ActivityIndicator size="small" color="#2E91FF" /> : <Ionicons name="refresh" size={20} color="#2E91FF" />}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {error ? (
          <View style={styles.center}>
            <Ionicons name="warning-outline" size={48} color="#FF4757" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="car-outline" size={54} color="#BDC3C7" />
            <Text style={styles.emptyText}>Chưa có phương tiện</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {vehicles.map((v) => {
              const info = getStatusInfo(v.status);
              const plate = v.licensePlate || v.plateNumber;
              return (
                <View key={v._id || v.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {v.name || v.model || 'Phương tiện'}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: info.color + '20' }]}>
                      <Ionicons name={info.icon} size={12} color={info.color} />
                      <Text style={[styles.statusText, { color: info.color }]}>{info.label}</Text>
                    </View>
                  </View>
                  <View style={styles.cardMeta}>
                    {plate && (
                      <View style={styles.metaRow}>
                        <Ionicons name="pricetag-outline" size={13} color="#7F8C8D" />
                        <Text style={styles.metaText}>{plate}</Text>
                      </View>
                    )}
                    {(v.type || v.category) && (
                      <View style={styles.metaRow}>
                        <Ionicons name="car-outline" size={13} color="#7F8C8D" />
                        <Text style={styles.metaText}>{v.type || v.category}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity style={styles.updateBtn} onPress={() => openEdit(v)}>
                    <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.updateText}>Cập nhật</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cập nhật trạng thái</Text>
            <View style={styles.optionList}>
              {STATUS_OPTIONS.map((opt) => {
                const active = selectedStatus === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionItem, active && { backgroundColor: opt.color + '20' }]}
                    onPress={() => setSelectedStatus(opt.value)}
                  >
                    <View style={[styles.optionDot, { backgroundColor: opt.color }]} />
                    <Text style={[styles.optionText, active && { color: opt.color }]}>{opt.label}</Text>
                    {active && <Ionicons name="checkmark-circle" size={18} color={opt.color} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setEditModal(false)}>
                <Text style={styles.modalBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={submitUpdate} disabled={updating}>
                {updating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalBtnText}>Xác nhận</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={notifyModal} transparent animationType="fade" onRequestClose={() => setNotifyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.notifyBox}>
            <View style={[styles.notifyIconWrap, notifyType === 'success' ? { backgroundColor: '#E8FFF1' } : { backgroundColor: '#FFF0F1' }]}>
              <Ionicons name={notifyType === 'success' ? 'checkmark-circle' : 'alert-circle'} size={36} color={notifyType === 'success' ? '#27AE60' : '#FF4757'} />
            </View>
            <Text style={styles.notifyText}>{notifyMessage}</Text>
            <TouchableOpacity style={styles.notifyBtn} onPress={() => setNotifyModal(false)}>
              <Text style={styles.notifyBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 15, color: '#747D8C', textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F2F6' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2F3542' },
  headerRight: { width: 40, alignItems: 'center' },
  errorText: { marginTop: 12, fontSize: 15, color: '#FF4757', textAlign: 'center' },
  emptyText: { marginTop: 12, fontSize: 15, color: '#A4B0BE' },
  scrollView: { flex: 1 },
  listContainer: { padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F2F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#2F3542', flex: 1, marginRight: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardMeta: { marginTop: 10, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#7F8C8D' },
  updateBtn: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#2E91FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  updateText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  modalOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalContent: { width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#2F3542', marginBottom: 12 },
  optionList: { gap: 8 },
  optionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ECF0F1', borderRadius: 10 },
  optionDot: { width: 12, height: 12, borderRadius: 6 },
  optionText: { flex: 1, fontSize: 14, color: '#2F3542' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#C0392B' },
  confirmBtn: { backgroundColor: '#2E91FF' },
  modalBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  notifyBox: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, alignItems: 'center' },
  notifyIconWrap: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  notifyText: { fontSize: 14, color: '#2F3542', textAlign: 'center', marginBottom: 16 },
  notifyBtn: { backgroundColor: '#2E91FF', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  notifyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});

export default VehicleListScreen;
