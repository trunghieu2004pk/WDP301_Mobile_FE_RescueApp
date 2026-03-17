import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TeamHomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  // teamId: thử các field phổ biến trong user object
  const teamId = user?.teamId || user?.team?._id || user?.team?.id || user?.rescueTeamId;

  const menuItems = [
    {
      id: 1,
      title: 'Tìm kiếm yêu cầu gần đây',
      icon: 'search',
      color: '#FF4757',
      screen: 'NearbyRequests',
      description: 'Tìm kiếm và nhận yêu cầu cứu hộ gần vị trí hiện tại',
    },
    {
      id: 2,
      title: 'Nhiệm vụ được phân công',
      icon: 'briefcase',
      color: '#2E91FF',
      screen: 'AssignedMissions',
      description: 'Xem các nhiệm vụ được điều phối viên phân công',
    },
    {
      id: 3,
      title: 'Bản đồ nhiệm vụ',
      icon: 'map',
      color: '#27AE60',
      screen: 'TeamMissionsMap',
      description: 'Theo dõi vị trí và lộ trình nhiệm vụ',
    },
    {
      id: 4,
      title: 'Thông tin đội',
      icon: 'people',
      color: '#F39C12',
      screen: 'TeamInfo',
      description: 'Xem thông tin đội và thành viên',
    },
    {
      id: 5,
      title: 'Phương tiện',
      icon: 'car',
      color: '#8E44AD',
      screen: 'TeamVehicles',
      description: 'Quản lý phương tiện được phân công',
    },
    {
      id: 6,
      title: 'Báo cáo công việc',
      icon: 'document-text',
      color: '#3498DB',
      screen: 'TeamReports',
      description: 'Gửi báo cáo và cập nhật tiến độ nhiệm vụ',
    },
  ];

  // Các screen cần teamId
  const SCREENS_NEED_TEAM_ID = ['NearbyRequests', 'TeamInfo', 'TeamVehicles', 'TeamMissionsMap'];

  const handleMenuItemPress = (screen) => {
    if (SCREENS_NEED_TEAM_ID.includes(screen)) {
      if (!teamId) {
        // teamId chưa có — vẫn navigate nhưng không có params
        // NearbyRequestsScreen sẽ hiển thị lỗi và hướng dẫn
        navigation.navigate(screen);
        return;
      }
      navigation.navigate(screen, { teamId });
      return;
    }
    navigation.navigate(screen);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Xin chào,</Text>
            <Text style={styles.userName}>{user?.fullName || user?.username || 'Thành viên đội'}</Text>
            <Text style={styles.roleText}>Thành viên đội cứu hộ</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={32} color="#2E91FF" />
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color="#F39C12" />
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Nhiệm vụ đang làm</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-done" size={24} color="#27AE60" />
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Đã hoàn thành</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="alert-circle" size={24} color="#FF4757" />
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Chờ xử lý</Text>
          </View>
        </View>

        {/* Menu Grid */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Công cụ làm việc</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleMenuItemPress(item.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Hành động nhanh</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleMenuItemPress('NearbyRequests')}
            >
              <Ionicons name="navigate" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Bắt đầu nhiệm vụ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => handleMenuItemPress('TeamReports')}
            >
              <Ionicons name="document-text" size={20} color="#2E91FF" />
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Báo cáo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#E74C3C" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: '#2E91FF',
    fontWeight: '600',
  },
  headerIcon: {
    padding: 12,
    backgroundColor: '#EBF4FF',
    borderRadius: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  menuContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 12,
    color: '#7F8C8D',
    lineHeight: 16,
  },
  quickActions: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E91FF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2E91FF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#2E91FF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  logoutText: {
    color: '#E74C3C',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default TeamHomeScreen;