import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CoordinatorHomeScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  const menuItems = [
    {
      id: 1,
      title: 'Danh sách yêu cầu',
      icon: 'list',
      color: '#FF4757',
      screen: 'RequestList',
      description: 'Xem và quản lý yêu cầu cứu hộ',
    },
    {
      id: 2,
      title: 'Danh sách đội cứu hộ',
      icon: 'people',
      color: '#2E91FF',
      screen: 'TeamList',
      description: 'Quản lý đội ngũ cứu hộ',
    },
    {
      id: 3,
      title: 'Bản đồ nhiệm vụ',
      icon: 'map',
      color: '#27AE60',
      screen: 'RescueMap',
      description: 'Theo dõi vị trí các đội cứu hộ',
    },
    {
      id: 4,
      title: 'Thống kê',
      icon: 'stats-chart',
      color: '#F39C12',
      screen: 'Statistics',
      description: 'Báo cáo và thống kê hoạt động',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollContainer}>

        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Xin chào!</Text>
            <Text style={styles.userName}>Điều phối viên</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Ionicons name="log-out-outline" size={18} color="#FF4757" />
              <Text style={styles.logoutButtonText}>Đăng xuất</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileBtn}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>ĐP</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <Ionicons name="time" size={20} color="#f39c12" />
            <Text style={styles.statusText}>Đang điều phối</Text>
          </View>
          <View style={styles.statusItem}>
            <Ionicons name="location" size={20} color="#e74c3c" />
            <Text style={styles.statusText}>Trung tâm điều phối</Text>
          </View>
        </View>

        {/* Menu grid */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Chức năng điều phối</Text>
          <View style={styles.servicesGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.serviceItem}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={28} color={item.color} />
                </View>
                <Text style={styles.serviceTitle}>{item.title}</Text>
                <Text style={styles.serviceDesc} numberOfLines={2}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Emergency button */}
        <View style={styles.emergencyContainer}>
          <TouchableOpacity style={styles.emergencyButton}>
            <Ionicons name="alert-circle" size={24} color="#fff" />
            <Text style={styles.emergencyText}>Báo động khẩn cấp</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
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
    backgroundColor: '#2E91FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  servicesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  serviceItem: {
    width: (Dimensions.get('window').width - 55) / 2,
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
  emergencyContainer: {
    padding: 20,
  },
  emergencyButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  emergencyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CoordinatorHomeScreen;