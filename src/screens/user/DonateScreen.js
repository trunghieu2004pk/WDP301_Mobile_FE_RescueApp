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
import { useNavigation } from '@react-navigation/native';
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
  const navigation = useNavigation();
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

  if (!user) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
        <View style={styles.center}>
          <View style={[styles.stateIcon, { backgroundColor: C.blueLight }]}>
            <Ionicons name="lock-closed-outline" size={36} color={C.blue} />
          </View>
          <Text style={styles.stateTitle}>Chưa đăng nhập</Text>
          <Text style={styles.stateSub}>
            Vui lòng đăng nhập để thực hiện quyên góp và lưu lịch sử ủng hộ.
          </Text>
          <TouchableOpacity
            style={[styles.stateBtn, { backgroundColor: C.blue }]}
            onPress={() => navigation.getParent()?.navigate('Trang chủ', { screen: 'Login' })}
            activeOpacity={0.85}
          >
            <Ionicons name="log-in-outline" size={16} color={C.white} />
            <Text style={styles.stateBtnText}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="heart" size={20} color={C.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Ủng hộ cứu hộ</Text>
              <Text style={styles.headerSubtitle}>Thanh toán qua VNPay an toàn</Text>
              <View style={styles.pillRow}>
                <View style={styles.pill}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={C.red} />
                  <Text style={styles.pillText}>VNPay</Text>
                </View>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('DonateHistory')}>
            <Ionicons name="time-outline" size={20} color={C.blue} />
            <Text style={styles.historyBtnText}>Lịch sử</Text>
          </TouchableOpacity>
        </View>


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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingBottom: 36, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  stateIcon: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  stateTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8, letterSpacing: -0.3 },
  stateSub: { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  stateBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  stateBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },
  headerCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  headerSubtitle: { marginTop: 2, fontSize: 12, color: C.sub },
  pillRow: { marginTop: 8, flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.redLight,
    borderWidth: 1,
    borderColor: '#FFCDD0',
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 12, fontWeight: '700', color: C.red },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blueLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  historyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.blue,
  },
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
