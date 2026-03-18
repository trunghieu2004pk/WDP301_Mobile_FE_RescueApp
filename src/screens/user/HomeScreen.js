import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, StatusBar, Dimensions, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  red:        '#E8293A',
  redLight:   '#FFF0F1',
  redBorder:  '#FFCDD0',
  blue:       '#2563EB',
  blueLight:  '#EFF6FF',
  blueBorder: '#BFDBFE', 
  green:      '#16A34A',
  greenLight: '#F0FDF4',
  amber:      '#D97706',
  amberLight: '#FFFBEB',
  slate:      '#57606F',
  slateLight: '#F8FAFC',
  text:       '#0F172A',
  sub:        '#64748B',
  muted:      '#94A3B8',
  border:     '#E2E8F0',
  bg:         '#F8FAFC',
  white:      '#FFFFFF',
};

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, getAuthHeaders } = useAuth();
  const [showLogoutModal, setShowLogoutModal]           = useState(false);
  const [showLoginPromptModal, setShowLoginPromptModal] = useState(false);
  const [showInProgressModal, setShowInProgressModal]   = useState(false);
  const [inProgressRequests, setInProgressRequests]     = useState([]);
  const [loadingInProgress, setLoadingInProgress]       = useState(false);
  const [inProgressError, setInProgressError]           = useState(null);

  const handleLogoutConfirm = () => { setShowLogoutModal(false); logout(); };

  const menuItems = [
    { id: 1, title: 'Báo cáo cứu hộ',     icon: 'alert-octagon',      color: C.red,   screen: 'EmergencyReport', description: 'Gửi yêu cầu trợ giúp khẩn cấp' },
    { id: 3, title: 'Số điện thoại khẩn', icon: 'phone-in-talk',      color: C.green, screen: 'RescueContact',   description: 'Hotline cứu hộ các khu vực' },
    { id: 4, title: 'Quyên góp',           icon: 'hand-heart',         color: C.amber, screen: 'Donate',          description: 'Ủng hộ hỗ trợ người dân vùng lũ' },
    { id: 6, title: 'Kỹ năng sinh tồn',   icon: 'book-open-variant',  color: C.slate, screen: 'Statistics',      description: 'Cẩm nang sinh tồn khi gặp lũ' },
  ];

  const fetchInProgress = useCallback(async () => {
    if (!user) { setInProgressRequests([]); return; }
    try {
      setLoadingInProgress(true);
      setInProgressError(null);
      const response = await fetch(`${API_URL}/rescue-requests/my-requests`, {
        method: 'GET', headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || `Lỗi ${response.status}`);
      const list = Array.isArray(data) ? data : data.data ?? data.requests ?? data.items ?? [];
      const IN_PROGRESS_SET = new Set(['IN_PROGRESS', 'PROCESSING', 'ON_THE_WAY']);
      setInProgressRequests(list.filter(r => IN_PROGRESS_SET.has(r?.status)));
    } catch (e) {
      setInProgressError(e.message || 'Không thể tải yêu cầu đang xử lý');
    } finally {
      setLoadingInProgress(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => { if (user) fetchInProgress(); }, [user, fetchInProgress]);

  const handleMenuPress = (screen) => {
    if (!user) { setShowLoginPromptModal(true); return; }
    navigation.navigate(screen);
  };

  // ─── Status label helper
  const statusLabel = (s) =>
    s === 'ON_THE_WAY' ? 'Đang đến nơi' : s === 'PROCESSING' ? 'Đang xử lý' : 'Đang tiến hành';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View>
            <Text style={styles.welcomeText}>Xin chào 👋</Text>
            <Text style={styles.userName}>{user?.name ?? user?.fullName ?? 'Khách'}</Text>
          </View>

          <View style={styles.headerActions}>
            {!user ? (
              <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginBtnText}>Đăng nhập</Text>
              </TouchableOpacity>
            ) : (
              <>
                {/* Notification bell */}
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => { setShowInProgressModal(true); fetchInProgress(); }}
                >
                  <Ionicons name="notifications-outline" size={20} color={C.text} />
                  {inProgressRequests.length > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {inProgressRequests.length > 99 ? '99+' : inProgressRequests.length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={() => setShowLogoutModal(true)}>
                  <Ionicons name="log-out-outline" size={17} color={C.red} />
                  <Text style={styles.logoutBtnText}></Text>
                </TouchableOpacity>
              </>
            )}

            {/* Avatar */}
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => navigation.navigate(user ? 'UserProfile' : 'Login')}
            >
              {user ? (
                <View style={[styles.avatarInner, { backgroundColor: C.red }]}>
                  <Text style={styles.avatarLetter}>
                    {(user?.fullName ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              ) : (
                <View style={[styles.avatarInner, { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border }]}>
                  <Ionicons name="person-outline" size={20} color={C.muted} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SOS Card ── */}
<TouchableOpacity
  style={styles.sosCard}
  activeOpacity={0.88}
  onPress={() => navigation.navigate('EmergencyReport')}
>
  <View style={styles.sosBg} />
  <View style={styles.sosRow}>
    <View style={{ flex: 1 }}>
      <View style={styles.sosBadge}>
        <Text style={styles.sosBadgeText}>KHẨN CẤP</Text>
      </View>
      <Text style={styles.sosTitle}>Bạn đang{'\n'}gặp nguy hiểm?</Text>
      <Text style={styles.sosSub}>Nhấn để gửi định vị cứu hộ ngay</Text>
      <View style={styles.sosBtn}>
        <Text style={styles.sosBtnText}>Gửi SOS ngay</Text>
        <Ionicons name="arrow-forward" size={14} color={C.blue} />  {/* ✅ */}
      </View>
    </View>
    <View style={styles.sosIconWrap}>
      <MaterialCommunityIcons name="alert-decagram" size={42} color={C.white} />
    </View>
  </View>
</TouchableOpacity>

        {/* ── Stats strip ── */}
        <View style={styles.statsStrip}>
          {[
            { value: '1,250', label: 'Ca cứu hộ',    color: C.red   },
            { value: '840',   label: 'Hoàn thành',   color: C.green },
            { value: '3,200', label: 'Quà cứu trợ', color: C.blue  },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.statsDivider} />}
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── Services ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dịch vụ hỗ trợ</Text>
          <View style={styles.grid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.gridItem}
                onPress={() => handleMenuPress(item.screen)}
                activeOpacity={0.72}
              >
                <View style={[styles.gridIcon, { backgroundColor: item.color + '18' }]}>
                  <MaterialCommunityIcons name={item.icon} size={26} color={item.color} />
                </View>
                <Text style={styles.gridTitle}>{item.title}</Text>
                <Text style={styles.gridDesc} numberOfLines={2}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ══ MODALS ══════════════════════════════════════════════════════════════ */}

      {/* Logout confirm */}
      <AppModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        iconName="log-out-outline"
        iconBg={C.redLight}
        iconColor={C.red}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?"
        cancelText="Hủy"
        confirmText="Đăng xuất"
        confirmColor={C.red}
        onConfirm={handleLogoutConfirm}
      />

      {/* Login prompt */}
      <AppModal
        visible={showLoginPromptModal}
        onClose={() => setShowLoginPromptModal(false)}
        iconName="lock-closed-outline"
        iconBg={C.blueLight}
        iconColor={C.blue}
        title="Yêu cầu đăng nhập"
        message="Bạn cần đăng nhập để sử dụng tính năng này. Vui lòng đăng nhập để tiếp tục."
        cancelText="Để sau"
        confirmText="Đăng nhập"
        confirmColor={C.blue}
        onConfirm={() => { setShowLoginPromptModal(false); navigation.navigate('Login'); }}
      />

      {/* In-progress requests */}
      <Modal
        visible={showInProgressModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInProgressModal(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { alignItems: 'stretch' }]}>
            {/* Header row */}
            <View style={styles.modalRow}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalIconWrap, { backgroundColor: C.blueLight, marginBottom: 0, width: 36, height: 36, borderRadius: 10 }]}>
                  <Ionicons name="sync-outline" size={18} color={C.blue} />
                </View>
                <Text style={styles.modalTitle}>Đang xử lý</Text>
              </View>
              <TouchableOpacity onPress={() => setShowInProgressModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={C.sub} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            {loadingInProgress ? (
              <View style={styles.modalCenter}>
                <Ionicons name="sync" size={24} color={C.blue} />
                <Text style={styles.modalHint}>Đang tải...</Text>
              </View>
            ) : inProgressError ? (
              <View style={styles.modalCenter}>
                <Text style={{ color: C.red }}>{inProgressError}</Text>
              </View>
            ) : inProgressRequests.length === 0 ? (
              <View style={styles.modalCenter}>
                <Text style={styles.modalHint}>Không có yêu cầu đang xử lý</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {inProgressRequests.map((r) => (
                  <View key={r._id || r.id} style={styles.notifRow}>
                    <View style={[styles.gridIcon, { backgroundColor: C.blueLight, marginBottom: 0 }]}>
                      <Ionicons name="refresh-outline" size={18} color={C.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifTitle} numberOfLines={1}>
                        {r.requestCode || (r._id || r.id)?.slice(-6)?.toUpperCase() || 'Yêu cầu'}
                      </Text>
                      <Text style={styles.notifSub}>{statusLabel(r.status)}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: C.blueLight }]}>
                      <Text style={[styles.statusPillText, { color: C.blue }]}>
                        {r.status === 'ON_THE_WAY' ? 'Đang đến' : 'Xử lý'}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Footer */}
            <View style={[styles.modalButtons, { marginTop: 16 }]}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowInProgressModal(false)}>
                <Text style={styles.btnSecondaryText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
  style={[styles.btnPrimary, { backgroundColor: C.blue }]}
  onPress={() => {
    setShowInProgressModal(false);
    navigation.navigate('Trạng thái');
  }}
>
  <Text style={styles.btnPrimaryText}>Xem tất cả</Text>
</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Reusable Modal Component ─────────────────────────────────────────────────
const AppModal = ({
  visible, onClose, iconName, iconBg, iconColor,
  title, message, cancelText, confirmText, confirmColor, onConfirm,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.modalBox}>
        <View style={[styles.modalIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={32} color={iconColor} />
        </View>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
            <Text style={styles.btnSecondaryText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: confirmColor }]} onPress={onConfirm}>
            <Text style={styles.btnPrimaryText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },

  // Header
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  welcomeText:    { fontSize: 13, color: C.muted, fontWeight: '500' },
  userName:       { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 2, letterSpacing: -0.4 },
  headerActions:  { flexDirection: 'row', alignItems: 'center', gap: 10 },

  loginBtn:       { backgroundColor: C.red, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  loginBtnText:   { color: C.white, fontSize: 13, fontWeight: '700' },

  iconBtn:        { width: 40, height: 40, borderRadius: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  badge:          { position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.red, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: C.white },
  badgeText:      { color: C.white, fontSize: 9, fontWeight: '800' },

  logoutBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.redLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: C.redBorder },
  logoutBtnText:  { color: C.red, fontSize: 13, fontWeight: '700' },

  avatar:         { width: 40, height: 40 },
  avatarInner:    { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarLetter:   { color: C.white, fontSize: 17, fontWeight: '800' },

// SOS Card — đổi C.red → C.blue / C.redLight → C.blueLight / C.redBorder → C.blueBorder
sosCard:     { marginHorizontal: 20, marginTop: 8, borderRadius: 22, backgroundColor: C.blueLight, borderWidth: 1, borderColor: C.blueBorder, padding: 22, overflow: 'hidden' },
sosBg:       { position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: C.blue + '12' },
sosRow:      { flexDirection: 'row', alignItems: 'center' },
sosBadge:    { backgroundColor: C.blue, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
sosBadgeText:{ color: C.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
sosTitle:    { fontSize: 20, fontWeight: '900', color: C.blue, lineHeight: 26, letterSpacing: -0.3 },
sosSub:      { fontSize: 12, color: '#60A5FA', marginTop: 4, fontWeight: '500' },
sosBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14, backgroundColor: C.white, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, shadowColor: C.blue, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
sosBtnText:  { fontSize: 13, fontWeight: '700', color: C.blue },
sosIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center', marginLeft: 16, shadowColor: C.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },

  // Stats strip
  statsStrip:     { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, backgroundColor: C.white, borderRadius: 18, paddingVertical: 18, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  statItem:       { flex: 1, alignItems: 'center' },
  statsDivider:   { width: 1, backgroundColor: C.border },
  statValue:      { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel:      { fontSize: 11, color: C.muted, marginTop: 3, fontWeight: '500' },

  // Services grid
  section:        { paddingHorizontal: 20, marginTop: 22 },
  sectionTitle:   { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginBottom: 14 },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem:       { width: (width - 52) / 2, backgroundColor: C.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  gridIcon:       { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridTitle:      { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  gridDesc:       { fontSize: 11, color: C.sub, lineHeight: 16 },

  // Modal shared
  overlay:        { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  modalBox:       { width: '100%', backgroundColor: C.white, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 },
  modalIconWrap:  { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle:     { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8, letterSpacing: -0.3 },
  modalMessage:   { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 22, marginBottom: 22 },
  modalButtons:   { flexDirection: 'row', gap: 10, width: '100%' },
  btnSecondary:   { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  btnSecondaryText:{ fontSize: 14, fontWeight: '700', color: C.sub },
  btnPrimary:     { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: C.white },

  // Modal row header
  modalRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, width: '100%' },
  modalTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  closeBtn:       { width: 32, height: 32, borderRadius: 10, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },

  // In-progress list
  modalCenter:    { paddingVertical: 20, alignItems: 'center', width: '100%' },
  modalHint:      { color: C.muted, marginTop: 8, fontSize: 14 },
  notifRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  notifTitle:     { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  notifSub:       { fontSize: 12, color: C.muted },
  statusPill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
});

export default HomeScreen;
