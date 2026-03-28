import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Linking, AppState } from 'react-native';
import { useAuth } from '../../context/AuthContext';

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

const DonateScreen = () => {
  const insets = useSafeAreaInsets();
  const { getAuthHeaders, user } = useAuth();

  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [statusText, setStatusText] = useState('');
  const [notifyVisible, setNotifyVisible] = useState(false);
  const [notifyType,   setNotifyType]   = useState('info');
  const [notifyTitle,  setNotifyTitle]  = useState('');
  const [notifyMsg,    setNotifyMsg]    = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const fetchHistory = React.useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}/donations`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const list = Array.isArray(data) ? data : data.data ?? data.items ?? data.results ?? [];
        setHistory(list);
      }
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  }, [user, getAuthHeaders]);

  const onDonate = async () => {
    const value = Number(amount);
    if (!value || value < 10000) {
      Alert.alert('Lỗi', 'Số tiền tối thiểu là 10.000đ');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/donations/vnpay-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ amount: value, message: message?.trim?.() || '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || `Lỗi ${res.status}`);
      }
      const paymentUrl = data?.paymentUrl || data?.url;
      const oid = data?.orderId || data?.id;
      setOrderId(oid || null);
      if (paymentUrl) {
        Linking.openURL(paymentUrl);
        setNotifyType('info');
        setNotifyTitle('Đang chờ thanh toán');
        setNotifyMsg('Đã mở VNPay trong trình duyệt. Vui lòng hoàn tất thanh toán, sau đó quay lại ứng dụng và bấm "Kiểm tra" để xem kết quả.');
        setNotifyVisible(true);
      } else {
        Alert.alert('Lỗi', 'Không nhận được liên kết thanh toán.');
      }
    } catch (e) {
      setNotifyType('error');
      setNotifyTitle('Lỗi');
      setNotifyMsg(e.message || 'Không thể tạo giao dịch VNPay.');
      setNotifyVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = React.useCallback(async () => {
    if (!orderId) {
      Alert.alert('Thông báo', 'Chưa có mã đơn để kiểm tra.');
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(`${API_URL}/donations/${orderId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || `Lỗi ${res.status}`);
      }
      const status = data?.status || data?.data?.status || 'UNKNOWN';
      const amountVnd = data?.amount || data?.data?.amount || value;
      setStatusText(`Mã đơn: ${orderId}\nTrạng thái: ${status}\nSố tiền: ${amountVnd || '-'}đ`);
      const s = String(status).toUpperCase();
      if (['PAID','SUCCESS','PAID_SUCCESS','PAID_OK','COMPLETED'].includes(s)) {
        setNotifyType('success');
        setNotifyTitle('Thanh toán thành công');
        setNotifyMsg(`Cảm ơn bạn đã ủng hộ! Mã đơn: ${orderId}`);
      } else if (['FAILED','CANCELLED','ERROR'].includes(s)) {
        setNotifyType('error');
        setNotifyTitle('Thanh toán thất bại');
        setNotifyMsg(`Giao dịch không thành công. Mã đơn: ${orderId}`);
      } else {
        setNotifyType('info');
        setNotifyTitle('Đang xử lý');
        setNotifyMsg(`Giao dịch đang được xử lý. Mã đơn: ${orderId}`);
      }
      setNotifyVisible(true);
      if (['PAID','SUCCESS','PAID_SUCCESS','PAID_OK','COMPLETED'].includes(s)) {
        fetchHistory();
      }
    } catch (e) {
      setNotifyType('error');
      setNotifyTitle('Lỗi');
      setNotifyMsg(e.message || 'Không thể kiểm tra trạng thái giao dịch.');
      setNotifyVisible(true);
    } finally {
      setChecking(false);
    }
  }, [orderId, getAuthHeaders]);

  React.useEffect(() => {
    const onUrl = (event) => {
      const url = event?.url || '';
      if (!url) return;
      if (url.includes('vnpay-return')) {
        try {
          const query = url.split('?')[1] || '';
          const params = Object.fromEntries(query.split('&').map(kv => {
            const [k, v] = kv.split('=');
            return [decodeURIComponent(k || ''), decodeURIComponent(v || '')];
          }));
          const oid = params.orderId || params.order_id || params.orderCode || null;
          if (oid) setOrderId(oid);
        } catch {}
        if (orderId || url.includes('orderId=')) {
          setTimeout(() => checkStatus(), 200);
        }
      }
    };
    const urlSub = Linking.addEventListener?.('url', onUrl);
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && orderId) {
        checkStatus();
      }
    });
    return () => {
      urlSub?.remove?.();
      appSub?.remove?.();
    };
  }, [orderId, checkStatus]);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const openDonationDetail = async (orderIdParam) => {
    setDetailVisible(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(`${API_URL}/donations/${encodeURIComponent(String(orderIdParam))}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || `Lỗi ${res.status}`);
      }
      setDetailData(data?.data ?? data);
    } catch (e) {
      setDetailData({ error: e.message || 'Không thể tải chi tiết giao dịch' });
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Ủng hộ hoạt động cứu hộ</Text>
          <View style={styles.badge}>
            <Ionicons name="heart" size={14} color={C.red} />
            <Text style={styles.badgeText}>VNPay</Text>
          </View>
        </View>

        {!user && (
          <View style={[styles.notice, { backgroundColor: C.blueLight }]}>
            <Ionicons name="information-circle-outline" size={18} color={C.blue} />
            <Text style={[styles.noticeText, { color: C.blue }]}>
              Bạn có thể ủng hộ không cần đăng nhập, nhưng đăng nhập giúp lưu lại lịch sử ủng hộ.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Số tiền (VND)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          placeholder="Ví dụ: 50000"
          placeholderTextColor={C.sub}
        />

        <Text style={styles.label}>Lời nhắn (không bắt buộc)</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Ví dụ: Ủng hộ đồng bào vùng lũ"
          placeholderTextColor={C.sub}
          multiline
        />

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={onDonate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={C.white} />
          ) : (
            <>
              <Ionicons name="card-outline" size={18} color={C.white} />
              <Text style={styles.btnText}>Ủng hộ qua VNPay</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.hr} />

        <Text style={styles.label}>Kiểm tra trạng thái giao dịch</Text>
        <View style={styles.row}>
          <Text style={styles.subText}>
            {orderId ? `Mã đơn hiện tại: ${orderId}` : 'Chưa có mã đơn. Hãy tạo giao dịch trước.'}
          </Text>
          <TouchableOpacity
            style={[styles.btnAlt, checking && { opacity: 0.7 }]}
            onPress={checkStatus}
            disabled={checking || !orderId}
          >
            {checking ? (
              <ActivityIndicator size="small" color={C.blue} />
            ) : (
              <Text style={[styles.btnTextAlt, { color: C.blue }]}>Kiểm tra</Text>
            )}
          </TouchableOpacity>
        </View>
        {!!statusText && (
          <View style={[styles.notice, { backgroundColor: C.bg }]}>
            <Ionicons name="receipt-outline" size={18} color={C.text} />
            <Text style={[styles.noticeText, { color: C.text }]}>{statusText}</Text>
          </View>
        )}

        <View style={styles.hr} />
        <Text style={styles.sectionTitle}>Lịch sử ủng hộ</Text>
        {!user ? (
          <View style={[styles.notice, { backgroundColor: C.blueLight }]}>
            <Ionicons name="lock-closed-outline" size={18} color={C.blue} />
            <Text style={[styles.noticeText, { color: C.blue }]}>
              Đăng nhập để xem lịch sử ủng hộ của bạn.
            </Text>
          </View>
        ) : historyLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <ActivityIndicator size="small" color={C.blue} />
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="time-outline" size={28} color={C.sub} />
            <Text style={styles.emptyHistoryText}>Chưa có giao dịch ủng hộ</Text>
          </View>
        ) : (
          history.map((h) => {
            const ord = h.orderId || h.orderCode;
            const id = h._id || h.id || ord;
            const amt = h.amount || h.totalAmount || 0;
            const when = h.createdAt || h.paidAt || h.updatedAt;
            const st = String(h.status || '').toUpperCase();
            const info =
              ['PAID','SUCCESS','PAID_SUCCESS','PAID_OK','COMPLETED'].includes(st)
                ? { color: C.green, bg: '#E8FFF1', icon: 'checkmark-circle', text: 'Thành công' }
                : ['PENDING','PROCESSING'].includes(st)
                ? { color: C.blue, bg: C.blueLight, icon: 'sync-outline', text: 'Đang xử lý' }
                : { color: C.red, bg: C.redLight, icon: 'alert-circle', text: 'Thất bại' };
            return (
              <TouchableOpacity key={id} style={styles.historyCard} activeOpacity={0.85} onPress={() => openDonationDetail(ord || id)}>
                <View style={styles.historyHead}>
                  <Text style={styles.orderText}>#{(ord || id)?.slice?.(-8)?.toUpperCase?.() || '—'}</Text>
                  <View style={[styles.statusPill, { backgroundColor: info.bg }]}>
                    <Ionicons name={info.icon} size={12} color={info.color} />
                    <Text style={[styles.statusPillText, { color: info.color }]}>{info.text}</Text>
                  </View>
                </View>
                <View style={styles.historyRow}>
                  <Text style={styles.amountText}>
                    {Number(amt).toLocaleString('vi-VN')} đ
                  </Text>
                  <Text style={styles.dateText}>
                    {when ? new Date(when).toLocaleString('vi-VN') : '—'}
                  </Text>
                </View>
                {h.message ? <Text style={styles.msgText}>{h.message}</Text> : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      <Modal visible={notifyVisible} transparent animationType="fade" onRequestClose={() => setNotifyVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.notifyBox}>
            <View
              style={[
                styles.notifyIconWrap,
                notifyType === 'success'
                  ? { backgroundColor: '#E8FFF1' }
                  : notifyType === 'error'
                  ? { backgroundColor: '#FFF0F1' }
                  : { backgroundColor: C.blueLight },
              ]}
            >
              <Ionicons
                name={
                  notifyType === 'success'
                    ? 'checkmark-circle'
                    : notifyType === 'error'
                    ? 'alert-circle'
                    : 'information-circle'
                }
                size={36}
                color={notifyType === 'success' ? C.green : notifyType === 'error' ? C.red : C.blue}
              />
            </View>
            <Text style={styles.modalTitleText}>{notifyTitle || 'Thông báo'}</Text>
            <Text style={styles.notifyText}>{notifyMsg}</Text>
            <TouchableOpacity style={styles.notifyBtn} onPress={() => setNotifyVisible(false)}>
              <Text style={styles.notifyBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailBox}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Chi tiết ủng hộ</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Ionicons name="close" size={20} color={C.sub} />
              </TouchableOpacity>
            </View>
            {detailLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <ActivityIndicator size="small" color={C.blue} />
              </View>
            ) : detailData?.error ? (
              <View style={[styles.notice, { backgroundColor: C.redLight }]}>
                <Ionicons name="alert-circle" size={18} color={C.red} />
                <Text style={[styles.noticeText, { color: C.red }]}>{detailData.error}</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <View style={styles.detailRowKV}>
                  <Text style={styles.kvLabel}>Mã đơn</Text>
                  <Text style={styles.kvValue}>{(detailData?._id || detailData?.id || detailData?.orderId || '').slice(-12).toUpperCase()}</Text>
                </View>
                <View style={styles.detailRowKV}>
                  <Text style={styles.kvLabel}>Số tiền</Text>
                  <Text style={styles.kvValue}>{Number(detailData?.amount || 0).toLocaleString('vi-VN')} đ</Text>
                </View>
                <View style={styles.detailRowKV}>
                  <Text style={styles.kvLabel}>Trạng thái</Text>
                  <Text style={styles.kvValue}>{detailData?.status || '—'}</Text>
                </View>
                <View style={styles.detailRowKV}>
                  <Text style={styles.kvLabel}>Thời gian</Text>
                  <Text style={styles.kvValue}>{detailData?.paidAt ? new Date(detailData.paidAt).toLocaleString('vi-VN') : (detailData?.createdAt ? new Date(detailData.createdAt).toLocaleString('vi-VN') : '—')}</Text>
                </View>
                {detailData?.message ? (
                  <View style={styles.detailMsgBox}>
                    <Text style={styles.detailMsgLabel}>Lời nhắn</Text>
                    <Text style={styles.detailMsgText}>{detailData.message}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingBottom: 36, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.redLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#FFCDD0' },
  badgeText: { color: C.red, fontSize: 12, fontWeight: '700' },
  label: { fontSize: 14, color: C.sub, fontWeight: '700', marginTop: 6 },
  input: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.red, paddingVertical: 14, borderRadius: 14, marginTop: 10 },
  btnText: { color: C.white, fontSize: 15, fontWeight: '800' },
  btnAlt: { backgroundColor: C.blueLight, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  btnTextAlt: { fontSize: 14, fontWeight: '700' },
  hr: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subText: { fontSize: 13, color: C.sub, flex: 1, paddingRight: 12 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  noticeText: { fontSize: 13, lineHeight: 20, flex: 1 },
  modalOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  notifyBox: { width: '100%', maxWidth: 360, backgroundColor: C.white, borderRadius: 18, padding: 20, alignItems: 'center' },
  notifyIconWrap: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  modalTitleText: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 6 },
  notifyBtn: { backgroundColor: C.red, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 6 },
  notifyBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 8 },
  emptyHistory: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  emptyHistoryText: { fontSize: 13, color: C.sub },
  historyCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  historyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  orderText: { fontSize: 12, color: C.sub, fontWeight: '700' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amountText: { fontSize: 16, fontWeight: '800', color: C.text },
  dateText: { fontSize: 12, color: C.sub },
  msgText: { marginTop: 8, fontSize: 13, color: C.text, lineHeight: 20 },
  detailBox: { width: '100%', maxWidth: 420, backgroundColor: C.white, borderRadius: 18, padding: 18 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  detailTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  detailRowKV: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kvLabel: { fontSize: 13, color: C.sub },
  kvValue: { fontSize: 13, color: C.text, fontWeight: '700' },
  detailMsgBox: { marginTop: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12 },
  detailMsgLabel: { fontSize: 12, color: C.sub, fontWeight: '700', marginBottom: 4 },
  detailMsgText: { fontSize: 13, color: C.text, lineHeight: 20 },
});

export default DonateScreen;
