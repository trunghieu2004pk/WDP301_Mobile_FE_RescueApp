import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLoginPromptModal, setShowLoginPromptModal] = useState(false);

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout();
  };

  const menuItems = [
    {
      id: 1,
      title: 'Báo cáo cứu hộ',
      icon: 'alert-octagon',
      color: '#FF4757',
      screen: 'EmergencyReport',
      description: 'Gửi yêu cầu trợ giúp khẩn cấp',
    },
    {
      id: 2,
      title: 'Bản đồ cứu trợ',
      icon: 'map-marker-radius',
      color: '#2E91FF',
      screen: 'DangerMap',
      description: 'Vùng ngập lụt & điểm tiếp tế',
    },
    {
      id: 3,
      title: 'Số điện thoại khẩn',
      icon: 'phone-control',
      color: '#27AE60',
      screen: 'RescueContact',
      description: 'Hotline cứu hộ các khu vực',
    },
    {
      id: 4,
      title: 'Cứu trợ & Quà tặng',
      icon: 'gift',
      color: '#F39C12',
      screen: 'Volunteer',
      description: 'Đăng ký nhận hoặc gửi cứu trợ',
    },
    {
      id: 5,
      title: 'Cảnh báo lũ',
      icon: 'waves',
      color: '#8E44AD',
      screen: 'NewsAlerts',
      description: 'Theo dõi mực nước & dự báo',
    },
    {
      id: 6,
      title: 'Thông tin chung',
      icon: 'information-variant',
      color: '#57606F',
      screen: 'Statistics',
      description: 'Cẩm nang kỹ năng sinh tồn',
    },
  ];

  const handleMenuPress = (screen) => {
    if (!user) {
      setShowLoginPromptModal(true);
      return;
    }
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top Header Section */}
        <View style={[styles.headerContainer, { paddingTop: insets.top + 20 }]}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Xin chào!</Text>
            {/* ← HIỆN TÊN USER NẾU ĐÃ ĐĂNG NHẬP */}
            <Text style={styles.userName}>{user?.name ?? user?.fullName ?? 'Khách'}</Text>
          </View>
          <View style={styles.headerButtons}>
            {!user ? (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginButtonText}>Đăng nhập</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => setShowLogoutModal(true)}
              >
                <Ionicons name="log-out-outline" size={18} color="#FF4757" />
                <Text style={styles.logoutButtonText}>Đăng xuất</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => user ? navigation.navigate('UserProfile') : navigation.navigate('Login')}
            >
              {user ? (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {(user?.fullName ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              ) : (
                <View style={styles.avatarCircleGuest}>
                  <Ionicons name="person-outline" size={22} color="#747D8C" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* SOS Card */}
        <TouchableOpacity
          style={styles.sosCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('EmergencyReport')}
        >
          <View style={styles.sosContent}>
            <View style={styles.sosLeft}>
              <Text style={styles.sosTitle}>BẠN ĐANG GẶP NGUY HIỂM?</Text>
              <Text style={styles.sosSubTitle}>Nhấn nút để gửi định vị cứu hộ ngay lập tức</Text>
              <View style={styles.sosActionBtn}>
                <Text style={styles.sosActionText}>Gửi SOS Ngay</Text>
                <Ionicons name="chevron-forward" size={16} color="#FF4757" />
              </View>
            </View>
            <View style={styles.sosRight}>
              <View style={styles.sosIconCircle}>
                <MaterialCommunityIcons name="alert-decagram" size={40} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Active Alerts Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cảnh báo mới nhất</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>Tất cả</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.alertsContainer}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 10 }}
        >
          <View style={[styles.alertCard, { borderColor: '#FF4757' }]}>
            <View style={[styles.alertBadge, { backgroundColor: '#FF4757' }]}>
              <Text style={styles.alertBadgeText}>KHẨN CẤP</Text>
            </View>
            <Text style={styles.alertTitle} numberOfLines={1}>Lũ quét tại huyện A</Text>
            <Text style={styles.alertTime}>10 phút trước</Text>
          </View>
          <View style={[styles.alertCard, { borderColor: '#F39C12' }]}>
            <View style={[styles.alertBadge, { backgroundColor: '#F39C12' }]}>
              <Text style={styles.alertBadgeText}>CẢNH BÁO</Text>
            </View>
            <Text style={styles.alertTitle} numberOfLines={1}>Mực nước sông dâng cao</Text>
            <Text style={styles.alertTime}>30 phút trước</Text>
          </View>
        </ScrollView>

        {/* Main Services Grid */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Dịch vụ hỗ trợ</Text>
          <View style={styles.servicesGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.serviceItem}
                onPress={() => handleMenuPress(item.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                  <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
                </View>
                <Text style={styles.serviceTitle}>{item.title}</Text>
                <Text style={styles.serviceDesc} numberOfLines={2}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Statistics Card */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Tình hình chung</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>1,250</Text>
              <Text style={styles.statLabel}>Ca cứu hộ</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#27AE60' }]}>840</Text>
              <Text style={styles.statLabel}>Hoàn thành</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#2E91FF' }]}>3,200</Text>
              <Text style={styles.statLabel}>Quà cứu trợ</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal xác nhận đăng xuất */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={36} color="#FF4757" />
            </View>
            <Text style={styles.modalTitle}>Đăng xuất</Text>
            <Text style={styles.modalMessage}>
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleLogoutConfirm}
              >
                <Text style={styles.modalConfirmText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal yêu cầu đăng nhập để dùng dịch vụ */}
      <Modal
        visible={showLoginPromptModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoginPromptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#EBF4FF' }]}>
              <Ionicons name="lock-closed-outline" size={36} color="#2E91FF" />
            </View>
            <Text style={styles.modalTitle}>Yêu cầu đăng nhập</Text>
            <Text style={styles.modalMessage}>
              Bạn cần đăng nhập để sử dụng tính năng này. Vui lòng đăng nhập để tiếp tục.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLoginPromptModal(false)}
              >
                <Text style={styles.modalCancelText}>Để sau</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#2E91FF' }]}
                onPress={() => {
                  setShowLoginPromptModal(false);
                  navigation.navigate('Login');
                }}
              >
                <Text style={styles.modalConfirmText}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#747D8C',
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2F3542',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loginButton: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  profileBtn: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    overflow: 'hidden',
  },
  avatarCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatarCircleGuest: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#F1F2F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DFE4EA',
  },
  sosCard: {
    backgroundColor: '#FFEDED',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFD1D1',
  },
  sosContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sosLeft: {
    flex: 1,
  },
  sosTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF4757',
  },
  sosSubTitle: {
    fontSize: 12,
    color: '#FF7F7F',
    marginTop: 4,
    fontWeight: '500',
  },
  sosActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sosActionText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF4757',
    marginRight: 4,
  },
  sosRight: {
    marginLeft: 15,
  },
  sosIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2F3542',
  },
  viewAllText: {
    fontSize: 14,
    color: '#2E91FF',
    fontWeight: '600',
  },
  alertsContainer: {
    marginBottom: 5,
  },
  alertCard: {
    width: width * 0.6,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    borderWidth: 1,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  alertBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2F3542',
  },
  alertTime: {
    fontSize: 12,
    color: '#A4B0BE',
    marginTop: 5,
  },
  servicesSection: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  serviceItem: {
    width: (width - 55) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F1F2F6',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2F3542',
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 11,
    color: '#747D8C',
    lineHeight: 16,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    padding: 20,
    marginTop: 15,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF4757',
  },
  statLabel: {
    fontSize: 12,
    color: '#747D8C',
    marginTop: 4,
    fontWeight: '500',
  },
  // Logout button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF0F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD1D1',
  },
  logoutButtonText: {
    color: '#FF4757',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF0F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2F3542',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: '#747D8C',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F2F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#747D8C',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FF4757',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HomeScreen;