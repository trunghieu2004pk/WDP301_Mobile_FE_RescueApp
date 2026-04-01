import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const C = {
  red:        '#E8293A', redLight:   '#FFF0F1', redBorder:  '#FFCDD0',
  blue:       '#2563EB', blueLight:  '#EFF6FF', blueBorder: '#BFDBFE',
  green:      '#16A34A', greenLight: '#F0FDF4',
  amber:      '#D97706', amberLight: '#FFFBEB',
  slate:      '#57606F', slateLight: '#F8FAFC',
  text:       '#0F172A', sub:        '#64748B', muted:      '#94A3B8',
  border:     '#E2E8F0', bg:         '#F8FAFC', white:      '#FFFFFF',
};

const TeamHomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const handleLogoutConfirm = () => { setShowLogoutModal(false); logout(); };

  const teamId =
    user?.teamId ||
    user?.team?._id ||
    user?.team?.id ||
    user?.rescueTeamId ||
    user?.rescueTeam?._id ||
    user?.rescueTeam?.id ||
    user?.team_id ||
    null;

  // ─── DEBUG ───────────────────────────────────────────────────────────────
  console.log('[TeamHome] full user object:', JSON.stringify(user, null, 2));
  console.log('[TeamHome] resolved teamId:', teamId);
  // ─────────────────────────────────────────────────────────────────────────

  const menuItems = [
    { id: 1, title: 'Yêu cầu gần đây',    icon: 'map-search',      color: C.red,   screen: 'NearbyRequests',  description: 'Tìm & nhận yêu cầu cứu hộ gần vị trí hiện tại' },
    { id: 2, title: 'Nhiệm vụ phân công',  icon: 'clipboard-check', color: C.blue,  screen: 'AssignedMissions', description: 'Xem nhiệm vụ được điều phối viên phân công' },
    { id: 3, title: 'Thông tin đội',       icon: 'account-group',   color: C.amber, screen: 'TeamDetail',       description: 'Xem thông tin đội và thành viên' },
  ];

  const SCREENS_NEED_TEAM_ID = ['NearbyRequests', 'TeamDetail'];

  const handleMenuItemPress = (screen) => {
    if (SCREENS_NEED_TEAM_ID.includes(screen)) {
      console.log('[TeamHome] navigating to', screen, 'with teamId:', teamId);
      navigation.navigate(screen, teamId ? { teamId } : {});
      return;
    }
    navigation.navigate(screen);
  };

  const handleLogout = async () => { setShowLogoutModal(true); };

  return (
    <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View>
            <Text style={styles.welcomeText}>{'Xin chào'}</Text>
            <Text style={styles.userName}>{user?.fullName || user?.username || 'Thành viên đội'}</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={13} color={C.blue} />
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={17} color={C.red} />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <View style={[styles.avatarInner, { backgroundColor: C.blue }]}>
                <Text style={styles.avatarLetter}>
                  {(user?.fullName ?? user?.username ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.missionCard} activeOpacity={0.88} onPress={() => handleMenuItemPress('AssignedMissions')}>
          <View style={styles.missionBg} />
          <View style={styles.missionRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.missionBadge}><Text style={styles.missionBadgeText}>{'NHIỆM VỤ'}</Text></View>
              <Text style={styles.missionTitle}>{'Nhiệm vụ\nđang hoạt động'}</Text>
              <Text style={styles.missionSub}>{'Nhấn để xem chi tiết nhiệm vụ'}</Text>
              <View style={styles.missionBtn}>
                <Text style={styles.missionBtnText}>{'Xem nhiệm vụ'}</Text>
                <Ionicons name="arrow-forward" size={14} color={C.blue} />
              </View>
            </View>
            <View style={styles.missionIconWrap}>
              <MaterialCommunityIcons name="shield-star" size={42} color={C.white} />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.statsStrip}>
          {[
            { value: '3',  label: 'Đang làm',   color: C.amber },
            { value: '12', label: 'Hoàn thành', color: C.green },
            { value: '2',  label: 'Chờ xử lý',  color: C.red   },
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'Công cụ làm việc'}</Text>
          <View style={styles.grid}>
            {menuItems.map((item) => (
              <TouchableOpacity key={item.id} style={styles.gridItem} onPress={() => handleMenuItemPress(item.screen)} activeOpacity={0.72}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.bg },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  welcomeText:      { fontSize: 13, color: C.muted, fontWeight: '500' },
  userName:         { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 2, letterSpacing: -0.4 },
  headerActions:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.blueLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: C.blueBorder },
  roleBadgeText:    { color: C.blue, fontSize: 12, fontWeight: '700' },
  logoutBtn:        { backgroundColor: C.redLight, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: C.redBorder },
  avatar:           { width: 40, height: 40 },
  avatarInner:      { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarLetter:     { color: C.white, fontSize: 17, fontWeight: '800' },
  missionCard:      { marginHorizontal: 20, marginTop: 8, borderRadius: 22, backgroundColor: C.blueLight, borderWidth: 1, borderColor: C.blueBorder, padding: 22, overflow: 'hidden' },
  missionBg:        { position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: C.blue + '12' },
  missionRow:       { flexDirection: 'row', alignItems: 'center' },
  missionBadge:     { backgroundColor: C.blue, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  missionBadgeText: { color: C.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  missionTitle:     { fontSize: 20, fontWeight: '900', color: C.blue, lineHeight: 26, letterSpacing: -0.3 },
  missionSub:       { fontSize: 12, color: '#60A5FA', marginTop: 4, fontWeight: '500' },
  missionBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14, backgroundColor: C.white, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, shadowColor: C.blue, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  missionBtnText:   { fontSize: 13, fontWeight: '700', color: C.blue },
  missionIconWrap:  { width: 72, height: 72, borderRadius: 36, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center', marginLeft: 16, shadowColor: C.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  statsStrip:       { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, backgroundColor: C.white, borderRadius: 18, paddingVertical: 18, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  statItem:         { flex: 1, alignItems: 'center' },
  statsDivider:     { width: 1, backgroundColor: C.border },
  statValue:        { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel:        { fontSize: 11, color: C.muted, marginTop: 3, fontWeight: '500' },
  section:          { paddingHorizontal: 20, marginTop: 22 },
  sectionTitle:     { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginBottom: 14 },
  grid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem:         { width: (width - 52) / 2, backgroundColor: C.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  gridIcon:         { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridTitle:        { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  gridDesc:         { fontSize: 11, color: C.sub, lineHeight: 16 },
  overlay:          { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  modalBox:         { width: '100%', backgroundColor: C.white, borderRadius: 24, padding: 24, alignItems: 'center' },
  modalIconWrap:    { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle:       { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8, letterSpacing: -0.3 },
  modalMessage:     { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 22, marginBottom: 22 },
  modalButtons:     { flexDirection: 'row', gap: 10, width: '100%' },
  btnSecondary:     { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  btnSecondaryText: { fontSize: 14, fontWeight: '700', color: C.sub },
  btnPrimary:       { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnPrimaryText:   { fontSize: 14, fontWeight: '700', color: C.white },
});

export default TeamHomeScreen;

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
