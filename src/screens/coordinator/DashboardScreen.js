import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  red:        '#E8293A', redLight:   '#FFF0F1', redBorder:  '#FFCDD0',
  blue:       '#2563EB', blueLight:  '#EFF6FF', blueBorder: '#BFDBFE',
  green:      '#16A34A', greenLight: '#F0FDF4',
  amber:      '#D97706', amberLight: '#FFFBEB',
  slate:      '#57606F',
  text:       '#0F172A', sub:        '#64748B', muted:      '#94A3B8',
  border:     '#E2E8F0', bg:         '#F8FAFC', white:      '#FFFFFF',
};

const STATUS_LABELS = {
  PENDING:     'Chờ xử lý',
  VERIFIED:    'Đã xác minh',
  PROCESSING:  'Đang xử lý',
  IN_PROGRESS: 'Đang xử lý',
  ON_THE_WAY:  'Đang đến',
  COMPLETED:   'Hoàn thành',
  CANCELLED:   'Đã hủy',
};

const EMERGENCY_MAP = {
  LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Khẩn cấp',
};

const EMERGENCY_COLORS = {
  LOW: C.green, MEDIUM: C.amber, HIGH: '#F97316', CRITICAL: C.red,
};

const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const startOfWeek  = () => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; };
const startOfMonth = () => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; };
const safeDate     = (v) => { try { return new Date(v); } catch { return null; } };

const DashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { getAuthHeaders } = useAuth();

  const [requests, setRequests]   = useState([]);
  const [teams, setTeams]         = useState([]);
  const [users, setUsers]         = useState([]);
  const [vehicles, setVehicles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const headers = getAuthHeaders();
      const [reqRes, teamRes, userRes, vehicleRes] = await Promise.allSettled([
        fetch(`${API_URL}/rescue-requests`, { method: 'GET', headers }),
        fetch(`${API_URL}/rescue-teams`,    { method: 'GET', headers }),
        fetch(`${API_URL}/users`,           { method: 'GET', headers }),
        fetch(`${API_URL}/vehicles`,        { method: 'GET', headers }),
      ]);

      const parseList = async (settled) => {
        if (settled.status !== 'fulfilled') return [];
        const res = settled.value;
        const data = await res.json().catch(() => ([]));
        if (!res.ok) return [];
        return Array.isArray(data) ? data : data.data ?? data.items ?? data.list ?? [];
      };

      const [reqList, teamList, userList, vehicleList] = await Promise.all([
        parseList(reqRes), parseList(teamRes), parseList(userRes), parseList(vehicleRes),
      ]);

      setRequests(reqList);
      setTeams(teamList);
      setUsers(userList);
      setVehicles(vehicleList);
    } catch (e) {
      setError(e.message || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // ─── Metrics ──────────────────────────────────────────────────────────────
  const today = startOfToday();
  const week  = startOfWeek();
  const month = startOfMonth();

  const createdInRange = (r, fromDate) => {
    const dt = safeDate(r.createdAt || r.date || r.created_at);
    return dt && dt >= fromDate;
  };

  const totalToday = requests.filter(r => createdInRange(r, today)).length;
  const totalWeek  = requests.filter(r => createdInRange(r, week)).length;
  const totalMonth = requests.filter(r => createdInRange(r, month)).length;

  const statusCounts = requests.reduce((acc, r) => {
    const s = r.status || 'UNKNOWN';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const total          = requests.length || 1;
  const completed      = statusCounts.COMPLETED || 0;
  const pending        = statusCounts.PENDING || 0;
  const inProgress     = (statusCounts.PROCESSING || 0) + (statusCounts.IN_PROGRESS || 0) + (statusCounts.ON_THE_WAY || 0);
  const completionRate = Math.round((completed / total) * 100);

  const teamStatusCounts = teams.reduce((acc, t) => {
    const s = t.status || 'UNKNOWN';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const teamsActive  = (teamStatusCounts.AVAILABLE || 0) + (teamStatusCounts.ON_MISSION || 0);
  const teamsOffline = teamStatusCounts.OFFLINE || 0;

  const avgResponseMinutes = (() => {
    const diffs = [];
    for (const r of requests) {
      const start  = safeDate(r.assignedAt  || r.assigned_at  || r.createdAt || r.date);
      const arrive = safeDate(r.onTheWayAt  || r.on_the_way_at || r.arrivalAt || r.arrival_at);
      if (start && arrive && arrive > start) diffs.push((arrive - start) / 60000);
    }
    if (diffs.length === 0) return '—';
    return `${Math.round(diffs.reduce((a,b)=>a+b,0) / diffs.length)} phút`;
  })();

  const emergencyCounts = requests.reduce((acc, r) => {
    const lvl = r.urgencyLevel || r.emergencyLevel || r.priority || 'UNKNOWN';
    acc[lvl] = (acc[lvl] || 0) + 1;
    return acc;
  }, {});

  const areaCounts = requests.reduce((acc, r) => {
    const area = r.district || r.area || r.location?.district || 'Khác';
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {});

  const teamTaskCounts = (() => {
    const map = new Map();
    for (const r of requests) {
      const id = r?.assignedTeamId?._id || r?.assignedTeamId || r?.assignedTeam || null;
      if (!id) continue;
      map.set(id, (map.get(id) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count);
  })();

  const usersOnDuty   = users.filter(u => u.status === 'ON_DUTY' || u.onDuty).length;
  const vehiclesReady = vehicles.filter(v => (v.status || 'AVAILABLE') === 'AVAILABLE').length;

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.blue} />
          <Text style={styles.loadingText}>{'Đang tải thống kê...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left','right','bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
      >
        {/* ── Top bar ── */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>{'Tổng quan'}</Text>
            <Text style={styles.pageSub}>{'Thống kê hoạt động cứu hộ'}</Text>
          </View>
        </View>

        {/* ── Quick stats strip ── */}
        <View style={styles.statsStrip}>
          {[
            { value: String(pending),     label: 'Chờ xử lý',  color: C.amber },
            { value: String(inProgress),  label: 'Đang xử lý', color: C.blue  },
            { value: String(completed),   label: 'Hoàn thành', color: C.green },
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

        {/* ══ SECTION: Tổng quan hoạt động ══ */}
        <SectionHeader title="Tổng quan hoạt động" icon="chart-timeline-variant" />

        {/* Theo thời gian */}
        <View style={styles.card}>
          <View style={styles.row3}>
            <MetricTile icon="calendar-today" color={C.blue}  label="Hôm nay"    value={String(totalToday)} />
            <MetricTile icon="calendar-week"  color={C.amber} label="7 ngày"     value={String(totalWeek)}  />
            <MetricTile icon="calendar-month" color={C.green} label="Tháng này"  value={String(totalMonth)} />
          </View>

          <View style={styles.divider} />

          {/* Tỉ lệ hoàn thành */}
          <View style={styles.completionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.completionLabel}>{'Tỷ lệ hoàn thành'}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${completionRate}%`, backgroundColor: C.green }]} />
              </View>
            </View>
            <Text style={[styles.completionPct, { color: C.green }]}>{completionRate}{'%'}</Text>
          </View>

          <View style={styles.divider} />

          {/* Chi tiết theo status */}
          <Text style={styles.sectionNote}>{'Chi tiết theo trạng thái'}</Text>
          <View style={styles.kvList}>
            {Object.entries(STATUS_LABELS).map(([key, label]) =>
              (statusCounts[key] || 0) > 0 ? (
                <KVRow key={key} label={label} value={String(statusCounts[key])} />
              ) : null
            )}
          </View>
        </View>

        {/* ══ SECTION: Hiệu suất đội ══ */}
        <SectionHeader title="Hiệu suất đội cứu hộ" icon="account-group" />
        <View style={styles.card}>
          <View style={styles.row3}>
            <MetricTile icon="check-circle-outline" color={C.green} label="Đang hoạt động" value={String(teamsActive)}  />
            <MetricTile icon="minus-circle-outline" color={C.red}   label="Offline"        value={String(teamsOffline)} />
            <MetricTile icon="timer-outline"        color={C.blue}  label="Phản hồi TB"    value={avgResponseMinutes}   />
          </View>

          {teamTaskCounts.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionNote}>{'Nhiệm vụ theo đội'}</Text>
              <View style={styles.kvList}>
                {teamTaskCounts.slice(0, 5).map((t) => (
                  <KVRow
                    key={t.id}
                    label={`Đội ${String(t.id).slice(-6).toUpperCase()}`}
                    value={String(t.count)}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        {/* ══ SECTION: Phân loại yêu cầu ══ */}
        <SectionHeader title="Phân loại yêu cầu" icon="shape" />
        <View style={styles.card}>
          {/* Mức độ khẩn cấp — dạng badge */}
          <Text style={styles.sectionNote}>{'Theo mức độ khẩn cấp'}</Text>
          <View style={styles.badgeRow}>
            {Object.entries(EMERGENCY_MAP).map(([k, label]) => (
              <View key={k} style={[styles.emergencyBadge, { backgroundColor: (EMERGENCY_COLORS[k] || C.muted) + '18', borderColor: (EMERGENCY_COLORS[k] || C.muted) + '44' }]}>
                <Text style={[styles.emergencyBadgeCount, { color: EMERGENCY_COLORS[k] || C.muted }]}>
                  {emergencyCounts[k] || 0}
                </Text>
                <Text style={[styles.emergencyBadgeLabel, { color: EMERGENCY_COLORS[k] || C.muted }]}>{label}</Text>
              </View>
            ))}
          </View>

          {Object.keys(areaCounts).length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionNote}>{'Theo khu vực'}</Text>
              <View style={styles.kvList}>
                {Object.entries(areaCounts).slice(0, 6).map(([area, count]) => (
                  <KVRow key={area} label={area} value={String(count)} />
                ))}
              </View>
            </>
          )}
        </View>

        {/* ══ SECTION: Nguồn lực ══ */}
        <SectionHeader title="Nguồn lực" icon="toolbox" />
        <View style={styles.card}>
          <View style={styles.row3}>
            <MetricTile icon="account-outline"    color={C.blue}  label="Thành viên trực"    value={String(usersOnDuty)}   />
            <MetricTile icon="car-outline"         color={C.green} label="Phương tiện sẵn"    value={String(vehiclesReady)} />
            <MetricTile icon="shield-outline"      color={C.amber} label="Tổng đội"           value={String(teams.length)}  />
          </View>
        </View>

        {/* Error */}
        {error && (
          <View style={[styles.card, { backgroundColor: C.redLight, borderColor: C.redBorder, marginTop: 12 }]}>
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={18} color={C.red} />
              <Text style={[styles.sectionNote, { color: C.red, marginBottom: 0 }]}>{'Lỗi tải dữ liệu'}</Text>
            </View>
            <Text style={{ color: C.red, fontSize: 13, marginTop: 4 }}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchAll}>
              <Ionicons name="refresh-outline" size={14} color={C.white} />
              <Text style={styles.retryBtnText}>{'Thử lại'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, icon }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderIcon}>
      <MaterialCommunityIcons name={icon} size={16} color={C.blue} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const MetricTile = ({ icon, color, label, value }) => (
  <View style={[styles.tile, { borderColor: color + '33' }]}>
    <View style={[styles.tileIcon, { backgroundColor: color + '18' }]}>
      <MaterialCommunityIcons name={icon} size={17} color={color} />
    </View>
    <Text style={styles.tileValue} numberOfLines={1}>{value}</Text>
    <Text style={styles.tileLabel} numberOfLines={2}>{label}</Text>
  </View>
);

const KVRow = ({ label, value }) => (
  <View style={styles.kvRow}>
    <Text style={styles.kvLabel}>{label}</Text>
    <View style={styles.kvValueWrap}>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: C.bg },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:        { marginTop: 12, fontSize: 14, color: C.muted, fontWeight: '500' },

  topBar:             { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn:            { width: 40, height: 40, borderRadius: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  pageTitle:          { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  pageSub:            { fontSize: 12, color: C.muted, fontWeight: '500', marginTop: 1 },

  // Stats strip
  statsStrip:         { flexDirection: 'row', marginHorizontal: 20, marginBottom: 8, backgroundColor: C.white, borderRadius: 18, paddingVertical: 18, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  statItem:           { flex: 1, alignItems: 'center' },
  statsDivider:       { width: 1, backgroundColor: C.border },
  statValue:          { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLabel:          { fontSize: 11, color: C.muted, marginTop: 3, fontWeight: '500' },

  // Section header
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginTop: 20, marginBottom: 8 },
  sectionHeaderIcon:  { width: 28, height: 28, borderRadius: 8, backgroundColor: C.blueLight, justifyContent: 'center', alignItems: 'center' },
  sectionTitle:       { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: -0.2 },

  // Card
  card:               { marginHorizontal: 20, backgroundColor: C.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  divider:            { height: 1, backgroundColor: C.border, marginVertical: 14 },

  // Metric tiles
  row3:               { flexDirection: 'row', gap: 8 },
  tile:               { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'flex-start', gap: 4 },
  tileIcon:           { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  tileValue:          { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  tileLabel:          { fontSize: 11, color: C.muted, fontWeight: '500', lineHeight: 14 },

  // Completion bar
  completionRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  completionLabel:    { fontSize: 13, color: C.sub, fontWeight: '600', marginBottom: 6 },
  progressBar:        { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  progressFill:       { height: '100%', borderRadius: 4 },
  completionPct:      { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },

  // KV list
  sectionNote:        { fontSize: 12, color: C.muted, fontWeight: '700', marginBottom: 10, letterSpacing: 0.3, textTransform: 'uppercase' },
  kvList:             { gap: 10 },
  kvRow:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kvLabel:            { fontSize: 13, color: C.sub, flex: 1 },
  kvValueWrap:        { backgroundColor: C.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  kvValue:            { fontSize: 13, fontWeight: '800', color: C.text },

  // Emergency badges
  badgeRow:           { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  emergencyBadge:     { flex: 1, minWidth: 70, borderWidth: 1, borderRadius: 14, padding: 10, alignItems: 'center', gap: 2 },
  emergencyBadgeCount:{ fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  emergencyBadgeLabel:{ fontSize: 11, fontWeight: '600' },

  // Error
  errorRow:           { flexDirection: 'row', alignItems: 'center', gap: 6 },
  retryBtn:           { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.red, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, marginTop: 12 },
  retryBtnText:       { color: C.white, fontWeight: '700', fontSize: 13 },
});

export default DashboardScreen;
