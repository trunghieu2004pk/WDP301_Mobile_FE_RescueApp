import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

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
  text:       '#0F172A',
  sub:        '#64748B',
  muted:      '#94A3B8',
  border:     '#E2E8F0',
  bg:         '#F8FAFC',
  white:      '#FFFFFF',
};

const CoordinatorHomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      id: 1,
      title: 'Danh sách yêu cầu',
      icon: 'clipboard-list',
      color: C.red,
      screen: 'RequestList',
      description: 'Xem và quản lý yêu cầu cứu hộ',
    },
    {
      id: 2,
      title: 'Danh sách đội',
      icon: 'account-group',
      color: C.blue,
      screen: 'TeamList',
      description: 'Quản lý đội ngũ cứu hộ',
    },
    {
      id: 3,
      title: 'Phương tiện',
      icon: 'car',
      color: C.green,
      screen: 'VehicleList',
      description: 'Xem và cập nhật trạng thái xe',
    },
    {
      id: 4,
      title: 'Thống kê',
      icon: 'chart-bar',
      color: C.amber,
      screen: 'Dashboard',
      description: 'Báo cáo và thống kê hoạt động',
    },
  ];

  return (
    <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View>
            <Text style={styles.welcomeText}>{'Xin chào 👋'}</Text>
            <Text style={styles.userName}>
              {user?.fullName || user?.username || 'Điều phối viên'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* Role badge */}
            <View style={styles.roleBadge}>
              <Ionicons name="shield-half" size={13} color={C.blue} />
              <Text style={styles.roleBadgeText}></Text>
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={17} color={C.red} />
            </TouchableOpacity>

            {/* Avatar */}
            <View style={styles.avatar}>
              <View style={[styles.avatarInner, { backgroundColor: C.blue }]}>
                <Text style={styles.avatarLetter}>
                  {(user?.fullName ?? user?.username ?? 'Đ').charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Hero Card ── */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('RequestList')}
        >
          <View style={styles.heroBg} />
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{'ĐIỀU PHỐI'}</Text>
              </View>
              <Text style={styles.heroTitle}>{'Quản lý\nyêu cầu cứu hộ'}</Text>
              <Text style={styles.heroSub}>{'Nhấn để xem danh sách yêu cầu'}</Text>
              <View style={styles.heroBtn}>
                <Text style={styles.heroBtnText}>{'Xem ngay'}</Text>
                <Ionicons name="arrow-forward" size={14} color={C.blue} />
              </View>
            </View>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons name="radio-tower" size={42} color={C.white} />
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Stats strip ── */}
        <View style={styles.statsStrip}>
          {[
            { value: '12', label: 'Chờ xử lý',  color: C.amber },
            { value: '5',  label: 'Đang xử lý', color: C.blue  },
            { value: '38', label: 'Hoàn thành', color: C.green },
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

        {/* ── Services grid ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'Chức năng điều phối'}</Text>
          <View style={styles.grid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.gridItem}
                onPress={() => navigation.navigate(item.screen)}
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
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },

  // Header
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  welcomeText:     { fontSize: 13, color: C.muted, fontWeight: '500' },
  userName:        { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 2, letterSpacing: -0.4 },
  headerActions:   { flexDirection: 'row', alignItems: 'center', gap: 10 },

  roleBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.blueLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: C.blueBorder },
  roleBadgeText:   { color: C.blue, fontSize: 12, fontWeight: '700' },

  logoutBtn:       { backgroundColor: C.redLight, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: C.redBorder },

  avatar:          { width: 40, height: 40 },
  avatarInner:     { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarLetter:    { color: C.white, fontSize: 17, fontWeight: '800' },

  // Hero card
  heroCard:        { marginHorizontal: 20, marginTop: 8, borderRadius: 22, backgroundColor: C.blueLight, borderWidth: 1, borderColor: C.blueBorder, padding: 22, overflow: 'hidden' },
  heroBg:          { position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: C.blue + '12' },
  heroRow:         { flexDirection: 'row', alignItems: 'center' },
  heroBadge:       { backgroundColor: C.blue, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  heroBadgeText:   { color: C.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  heroTitle:       { fontSize: 20, fontWeight: '900', color: C.blue, lineHeight: 26, letterSpacing: -0.3 },
  heroSub:         { fontSize: 12, color: '#60A5FA', marginTop: 4, fontWeight: '500' },
  heroBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14, backgroundColor: C.white, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, shadowColor: C.blue, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  heroBtnText:     { fontSize: 13, fontWeight: '700', color: C.blue },
  heroIconWrap:    { width: 72, height: 72, borderRadius: 36, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center', marginLeft: 16, shadowColor: C.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },

  // Stats strip
  statsStrip:      { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, backgroundColor: C.white, borderRadius: 18, paddingVertical: 18, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  statItem:        { flex: 1, alignItems: 'center' },
  statsDivider:    { width: 1, backgroundColor: C.border },
  statValue:       { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel:       { fontSize: 11, color: C.muted, marginTop: 3, fontWeight: '500' },

  // Services grid
  section:         { paddingHorizontal: 20, marginTop: 22 },
  sectionTitle:    { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginBottom: 14 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem:        { width: (width - 52) / 2, backgroundColor: C.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  gridIcon:        { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridTitle:       { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  gridDesc:        { fontSize: 11, color: C.sub, lineHeight: 16 },
});

export default CoordinatorHomeScreen;
