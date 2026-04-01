import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const C = {
  red: '#E8293A',
  redLight: '#FFF0F1',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
  green: '#16A34A',
  text: '#0F172A',
  sub: '#64748B',
  border: '#E2E8F0',
  bg: '#F8FAFC',
  white: '#FFFFFF',
};

/* =========================
   STATUS HELPER
========================= */
const getStatusInfo = (status) => {
  const st = String(status || '')
    .toUpperCase()
    .replace(/[-\s]/g, '_');

  if (['PAID', 'SUCCESS', 'COMPLETED', 'PAID_SUCCESS'].includes(st)) {
    return { color: C.green, bg: '#E8FFF1', icon: 'checkmark-circle', text: 'Thành công' };
  }
  if (['PENDING', 'PROCESSING'].includes(st)) {
    return { color: C.blue, bg: C.blueLight, icon: 'sync-outline', text: 'Đang xử lý' };
  }
  return { color: C.red, bg: C.redLight, icon: 'alert-circle', text: 'Thất bại' };
};

/* =========================
   ITEM COMPONENT (MEMO)
========================= */
const HistoryItem = memo(({ item, onPress }) => {
  const ord = item.orderId || item.orderCode;
  const id = item._id || item.id || ord;
  const amt = Number(item.amount || item.totalAmount) || 0;
  const when = item.createdAt || item.paidAt || item.updatedAt;

  const info = getStatusInfo(item.status);

  return (
    <TouchableOpacity style={styles.historyCard} activeOpacity={0.85} onPress={() => onPress?.(item)}>
      <View style={styles.historyHead}>
        <Text style={styles.orderText}>
          #{(ord || id)?.slice?.(-8)?.toUpperCase?.() || '—'}
        </Text>

        <View style={[styles.statusPill, { backgroundColor: info.bg }]}>
          <Ionicons name={info.icon} size={12} color={info.color} />
          <Text style={[styles.statusPillText, { color: info.color }]}>
            {info.text}
          </Text>
        </View>
      </View>

      <View style={styles.historyRow}>
        <Text style={styles.amountText}>
          {amt.toLocaleString('vi-VN')} đ
        </Text>
        <Text style={styles.dateText}>
          {when ? new Date(when).toLocaleString('vi-VN') : '—'}
        </Text>
      </View>

      {!!item.message && (
        <Text style={styles.msgText}>{item.message}</Text>
      )}
    </TouchableOpacity>
  );
});

/* =========================
   MAIN SCREEN
========================= */
const DonateHistoryScreen = () => {
  const { getAuthHeaders, user } = useAuth();
  const navigation = useNavigation();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailError, setDetailError] = useState(null);

  const abortRef = useRef(null);
  const detailAbortRef = useRef(null);

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const res = await fetch(`${API_URL}/donations/my-history`, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      const list = Array.isArray(data)
        ? data
        : data?.data || data?.items || data?.results || [];

      setHistory(list);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Fetch error:', err);
        setError('Không thể tải dữ liệu');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
    return () => abortRef.current?.abort();
  }, [fetchHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
  };

  const openDetail = async (item) => {
    try {
      setDetailVisible(true);
      setDetailLoading(true);
      setDetailError(null);
      setDetailData(null);
      detailAbortRef.current?.abort?.();
      detailAbortRef.current = new AbortController();
      const oid = item?.orderId || item?.orderCode || item?._id || item?.id;
      const res = await fetch(`${API_URL}/donations/${encodeURIComponent(String(oid))}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: detailAbortRef.current.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      const detail = data?.data ?? data;
      setDetailData(detail);
    } catch (e) {
      setDetailError(e.message || 'Không thể tải chi tiết quyên góp');
    } finally {
      setDetailLoading(false);
    }
  };

  const totalAmount = React.useMemo(
    () => history.reduce((s, it) => s + (Number(it?.amount || it?.totalAmount) || 0), 0),
    [history]
  );

  const renderHeader = () => (
    <View style={{ gap: 8 }}>
      <TouchableOpacity
        style={[styles.backBtn, { alignSelf: 'flex-start' }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={20} color={C.blue} />
      </TouchableOpacity>
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="time-outline" size={20} color={C.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Lịch sử quyên góp</Text>
            <Text style={styles.headerSubtitle}>
              {`${history.length} giao dịch · ${totalAmount.toLocaleString('vi-VN')} đ`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  /* =========================
     RENDER STATES
  ========================= */

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={C.sub} />
          <Text style={styles.emptyText}>
            Đăng nhập để xem lịch sử quyên góp
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={C.red} />
          <Text style={styles.emptyText}>{error}</Text>

          <TouchableOpacity onPress={fetchHistory} style={styles.retryBtn}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={history}
        renderItem={({ item }) => <HistoryItem item={item} onPress={openDetail} />}
        keyExtractor={(item, index) =>
          item._id || item.id || item.orderId || `fallback-${index}`
        }
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        windowSize={5}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.blue]}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="time-outline" size={48} color={C.sub} />
            <Text style={styles.emptyText}>
              Chưa có lịch sử quyên góp
            </Text>
          </View>
        }
      />

      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailBox}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Chi tiết quyên góp</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Ionicons name="close" size={20} color={C.sub} />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={styles.center}><ActivityIndicator size="small" color={C.blue} /></View>
            ) : detailError ? (
              <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={24} color={C.red} />
                <Text style={styles.emptyText}>{detailError}</Text>
              </View>
            ) : (
              (() => {
                const info = getStatusInfo(detailData?.status);
                return (
                  <View style={{ gap: 12 }}>
                    <View style={styles.heroRow}>
                      <View style={[styles.iconCircle, { backgroundColor: info.bg }]}>
                        <Ionicons name={info.icon} size={28} color={info.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.amountBig}>
                          {Number(detailData?.amount || 0).toLocaleString('vi-VN')} đ
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: info.bg, alignSelf: 'flex-start', marginTop: 4 }]}>
                          <Ionicons name={info.icon} size={12} color={info.color} />
                          <Text style={[styles.statusPillText, { color: info.color }]}>{info.text}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.orderMono}>{detailData?.orderId || detailData?._id || '—'}</Text>
                    <View style={styles.divider} />
                    {!!detailData?.message && (
                      <View style={styles.kvRow}>
                        <Text style={styles.kvLabel}>Lời nhắn</Text>
                        <Text style={styles.kvValue}>{detailData?.message}</Text>
                      </View>
                    )}
                    {!!detailData?.vnp_TransactionNo && (
                      <View style={styles.kvRow}>
                        <Text style={styles.kvLabel}>Mã giao dịch</Text>
                        <Text style={styles.kvValue}>{detailData?.vnp_TransactionNo}</Text>
                      </View>
                    )}
                    <View style={styles.kvRow}>
                      <Text style={styles.kvLabel}>Tạo lúc</Text>
                      <Text style={styles.kvValue}>{detailData?.createdAt ? new Date(detailData.createdAt).toLocaleString('vi-VN') : '—'}</Text>
                    </View>
                    <View style={styles.kvRow}>
                      <Text style={styles.kvLabel}>Cập nhật</Text>
                      <Text style={styles.kvValue}>{detailData?.updatedAt ? new Date(detailData.updatedAt).toLocaleString('vi-VN') : '—'}</Text>
                    </View>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => setDetailVisible(false)}>
                      <Text style={styles.primaryBtnText}>Đóng</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  listContent: { padding: 16 },

  headerCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.blueLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  backText: { color: C.blue, fontWeight: '700', fontSize: 13 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrap: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.blueLight, borderWidth: 1, borderColor: '#BFDBFE',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  headerSubtitle: { marginTop: 2, fontSize: 12, color: C.sub },

  historyCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },

  historyHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  orderText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.sub,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },

  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  amountText: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },

  dateText: {
    fontSize: 12,
    color: C.sub,
  },

  msgText: {
    marginTop: 10,
    fontSize: 13,
    color: C.sub,
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },

  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: C.sub,
    textAlign: 'center',
  },

  retryBtn: {
    marginTop: 16,
    backgroundColor: C.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  modalOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  detailBox: {
    width: '100%', maxWidth: 420, backgroundColor: C.white, borderRadius: 18,
    borderWidth: 1, borderColor: C.border, padding: 18,
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  amountBig: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 0.2 },
  orderMono: { fontSize: 12, color: C.sub },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  kvLabel: { fontSize: 13, color: C.sub },
  kvValue: { fontSize: 13, color: C.text, fontWeight: '700' },
  primaryBtn: {
    marginTop: 12, backgroundColor: C.blue, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

export default DonateHistoryScreen;
