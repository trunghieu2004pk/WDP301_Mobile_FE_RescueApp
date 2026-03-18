import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StatusBar } from 'react-native';

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  primary:    '#1A6BFF',
  primaryDim: '#EBF1FF',
  danger:     '#FF3B30',
  dangerDim:  '#FFF0EF',
  success:    '#00C48C',
  successDim: '#E6FAF4',
  warn:       '#FF9500',
  warnDim:    '#FFF6E6',
  bg:         '#F4F7FC',
  card:       '#FFFFFF',
  border:     '#E4EAF4',
  text:       '#0F1923',
  sub:        '#5A6477',
  muted:      '#9BA7B8',
};

const S = {
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    // shadow
    shadowColor: '#1A2E55',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  screenBg: { flex: 1, backgroundColor: C.bg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 4,
  },
};

// ─── Shared: Screen Header ────────────────────────────────────────────────────
const ScreenHeader = ({ icon, title, subtitle, accent = C.primary, accentDim = C.primaryDim }) => (
  <View style={{ backgroundColor: C.card, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: accentDim, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
    </View>
    <Text style={{ fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>{title}</Text>
    {subtitle ? <Text style={{ fontSize: 14, color: C.sub, marginTop: 4 }}>{subtitle}</Text> : null}
  </View>
);

// ─── Placeholder Badge ────────────────────────────────────────────────────────
const ComingSoonBadge = () => (
  <View style={{ backgroundColor: C.warnDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8 }}>
    <Text style={{ fontSize: 11, fontWeight: '700', color: C.warn, letterSpacing: 0.5 }}>SẮP RA MẮT</Text>
  </View>
);

// ─── Screens ─────────────────────────────────────────────────────────────────

export const DangerMapScreen = () => (
  <View style={S.screenBg}>
    <StatusBar barStyle="dark-content" />
    <ScreenHeader icon="🗺️" title="Bản đồ nguy hiểm" subtitle="Theo dõi vùng nguy hiểm theo thời gian thực" accent={C.danger} accentDim={C.dangerDim} />
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <View style={{ ...S.card, width: '100%', alignItems: 'center', padding: 32, gap: 12 }}>
        <Text style={{ fontSize: 48 }}>📍</Text>
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>Bản đồ đang được tải</Text>
        <Text style={{ fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 21 }}>
          Tích hợp bản đồ thời gian thực sẽ hiển thị ở đây
        </Text>
        <ComingSoonBadge />
      </View>
    </View>
  </View>
);

export const RescueContactScreen = () => (
  <View style={S.screenBg}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      {[
        { label: 'Cứu hỏa – PCCC',     number: '114', icon: '🚒', accent: C.danger },
        { label: 'Cảnh sát',            number: '113', icon: '🚔', accent: C.primary },
        { label: 'Cấp cứu y tế',        number: '115', icon: '🚑', accent: C.success },
        { label: 'Đường dây thiên tai', number: '1800 599 928', icon: '🌊', accent: C.warn },
      ].map((item) => (
        <TouchableOpacity
          key={item.number}
          activeOpacity={0.75}
          style={{ ...S.card, flexDirection: 'row', alignItems: 'center', gap: 14 }}
        >
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: item.accent + '18', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 22 }}>{item.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: C.sub, marginBottom: 2 }}>{item.label}</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: item.accent, letterSpacing: -0.5 }}>{item.number}</Text>
          </View>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: item.accent + '18', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 16 }}>📞</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

export const VolunteerScreen = () => (
  <View style={S.screenBg}>
    <ScreenHeader icon="🤝" title="Tình nguyện viên" subtitle="Đăng ký hỗ trợ cộng đồng" accent={C.success} accentDim={C.successDim} />
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={S.sectionTitle}>Vai trò cần hỗ trợ</Text>
      {[
        { title: 'Cứu trợ thực địa',     desc: 'Hỗ trợ vận chuyển, phân phát nhu yếu phẩm',  icon: '🏕️', spots: '12 chỗ còn' },
        { title: 'Điều phối trực tuyến', desc: 'Theo dõi thông tin, liên lạc với các đội',     icon: '💻', spots: '8 chỗ còn' },
        { title: 'Y tế & Sơ cứu',        desc: 'Hỗ trợ y tế cơ bản tại điểm tập kết',         icon: '🩺', spots: '5 chỗ còn' },
      ].map((r) => (
        <View key={r.title} style={{ ...S.card, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 26 }}>{r.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{r.title}</Text>
              <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{r.desc}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border }}>
            <View style={{ backgroundColor: C.successDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.success }}>{r.spots}</Text>
            </View>
            <TouchableOpacity style={{ backgroundColor: C.success, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Đăng ký</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  </View>
);

export const NewsAlertsScreen = () => (
  <View style={S.screenBg}>
    <ScreenHeader icon="📢" title="Tin tức & Cảnh báo" subtitle="Cập nhật mới nhất từ cơ quan chức năng" accent={C.warn} accentDim={C.warnDim} />
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={S.sectionTitle}>Cảnh báo mới nhất</Text>
      {[
        { title: 'Mưa lớn tại miền Trung',     time: '2 giờ trước',  level: 'CAO',   levelColor: C.danger,  icon: '⚠️' },
        { title: 'Lũ quét tại Quảng Nam',       time: '5 giờ trước',  level: 'RẤT CAO', levelColor: '#C0001A', icon: '🌊' },
        { title: 'Thông báo sơ tán khu vực 3',  time: '8 giờ trước',  level: 'TRUNG BÌNH', levelColor: C.warn, icon: '📣' },
      ].map((n) => (
        <TouchableOpacity key={n.title} activeOpacity={0.75} style={{ ...S.card, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 24, marginTop: 2 }}>{n.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 }}>{n.title}</Text>
            <Text style={{ fontSize: 12, color: C.muted }}>{n.time}</Text>
          </View>
          <View style={{ backgroundColor: n.levelColor + '18', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: n.levelColor }}>{n.level}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// ─── Statistics / Tips ────────────────────────────────────────────────────────
const TIPS = [
  { id: 1, title: 'Giữ an toàn điện',           desc: 'Ngắt cầu dao tổng khi có nguy cơ ngập. Tránh chạm vào thiết bị điện ướt.',              icon: '⚡', accent: C.warn },
  { id: 2, title: 'Chuẩn bị túi khẩn cấp',      desc: 'Nước, thực phẩm khô 3 ngày, đèn pin, sạc dự phòng, thuốc men, giấy tờ.',               icon: '🎒', accent: C.primary },
  { id: 3, title: 'Chọn đường cao',              desc: 'Sơ tán theo đường cao, tránh suối ngầm và nơi dòng chảy xiết.',                         icon: '⛰️', accent: C.success },
  { id: 4, title: 'Gọi trợ giúp đúng cách',     desc: 'Dùng còi/vải sáng hoặc ứng dụng để gửi vị trí. Tiết kiệm pin điện thoại.',             icon: '📡', accent: C.primary },
  { id: 5, title: 'Không lội qua nước chảy',    desc: '30 cm nước cũng có thể cuốn trôi người. Không cố vượt qua dòng chảy xiết.',            icon: '🌊', accent: C.danger },
];

export const StatisticsScreen = () => (
  <View style={S.screenBg}>
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={S.sectionTitle}>Hướng dẫn quan trọng</Text>
      <View style={{ gap: 12 }}>
        {TIPS.map((tip, idx) => (
          <View key={tip.id} style={{ ...S.card, flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
            {/* Index + icon */}
            <View style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: tip.accent + '18', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 22 }}>{tip.icon}</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: tip.accent }}>0{idx + 1}</Text>
            </View>
            {/* Text */}
            <View style={{ flex: 1, paddingTop: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 6 }}>{tip.title}</Text>
              <Text style={{ fontSize: 13, color: C.sub, lineHeight: 20 }}>{tip.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  </View>
);

// ─── Donate ───────────────────────────────────────────────────────────────────
export const DonateScreen = () => (
  <View style={S.screenBg}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
      {/* Stat row */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[
          { label: 'Lượt quyên góp', value: '2.4K', icon: '👥' },
          { label: 'Đã huy động',    value: '1.2 tỷ', icon: '💰' },
        ].map((s) => (
          <View key={s.label} style={{ ...S.card, flex: 1, alignItems: 'center', padding: 18, gap: 6 }}>
            <Text style={{ fontSize: 24 }}>{s.icon}</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.primary }}>{s.value}</Text>
            <Text style={{ fontSize: 12, color: C.sub }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Methods */}
      <Text style={S.sectionTitle}>Phương thức quyên góp</Text>
      {[
        { title: 'Chuyển khoản ngân hàng',   desc: 'Vietcombank / BIDV / Agribank',  icon: '🏦', ready: false },
        { title: 'Ví MoMo',                  desc: 'Quét mã QR hoặc nhập số điện thoại', icon: '📱', ready: false },
        { title: 'ZaloPay',                  desc: 'Thanh toán nhanh qua ứng dụng',  icon: '⚡', ready: false },
      ].map((m) => (
        <TouchableOpacity key={m.title} activeOpacity={0.75} style={{ ...S.card, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.primaryDim, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 22 }}>{m.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{m.title}</Text>
            <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{m.desc}</Text>
          </View>
          <ComingSoonBadge />
        </TouchableOpacity>
      ))}

      {/* Info note */}
      <View style={{ ...S.card, backgroundColor: C.primaryDim, borderColor: C.primary + '30', flexDirection: 'row', gap: 10 }}>
        <Text style={{ fontSize: 18 }}>ℹ️</Text>
        <Text style={{ flex: 1, fontSize: 13, color: C.primary, lineHeight: 20 }}>
          Tính năng thanh toán sẽ sớm được tích hợp. Hiện tại vui lòng liên hệ ban điều phối để nhận thông tin chuyển khoản trực tiếp.
        </Text>
      </View>
    </ScrollView>
  </View>
);