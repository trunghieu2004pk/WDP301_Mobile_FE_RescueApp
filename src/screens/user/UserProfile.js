import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const UserProfile = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, getAuthHeaders } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user profile data from API
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Lỗi ${response.status}: Không thể tải thông tin hồ sơ`);
      }

      const data = await response.json();
      setUserData(data?.data || data);
    } catch (err) {
      setError(err.message);
      Alert.alert('Lỗi', err.message || 'Không thể tải thông tin hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // Fallback data if API fails
  const fakeUserData = {
    id: 1,
    username: user?.username || 'nguyenvana',
    fullName: user?.name || 'Nguyễn Văn A',
    phone: '0912345678',
    address: '123 Đường Nguyễn Văn Linh, Quận 7, TP. HCM',
    joinDate: '15/03/2024',
    status: 'active',
    role: user?.role || 'user',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
    stats: {
      rescueRequests: 3,
      completedRequests: 2,
      pendingRequests: 1,
      volunteerHours: 12
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { 
      userData: {
        username: userData?.username || user?.username,
        name: userData?.name || userData?.fullName || user?.name,
        phone: userData?.phone
      }
    });
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E91FF" />
          <Text style={styles.loadingText}>Đang tải thông tin hồ sơ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF4757" />
          <Text style={styles.errorText}>Không thể tải thông tin hồ sơ</Text>
          <Text style={styles.errorSubText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 20) }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchUserProfile}
            colors={['#2E91FF']}
          />
        }
      >

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: userData?.avatar || fakeUserData.avatar }}
              style={styles.avatar}
            />
            <View style={styles.onlineStatus} />
          </View>
          
          <Text style={styles.userName}>{userData?.name || userData?.fullName || fakeUserData.fullName}</Text>
          <Text style={styles.userRole}>
            {userData?.role === 'admin' ? 'Quản trị viên' : 
             userData?.role === 'staff' ? 'Nhân viên cứu hộ' :
             userData?.role === 'COORDINATOR' ? 'Điều phối viên' : 
             user?.role === 'admin' ? 'Quản trị viên' :
             user?.role === 'staff' ? 'Nhân viên cứu hộ' :
             user?.role === 'COORDINATOR' ? 'Điều phối viên' : 'Người dùng'}
          </Text>
          
          <Text style={styles.joinDate}>
            <Ionicons name="calendar" size={14} color="#747D8C" />
            {' '}Tham gia từ {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('vi-VN') : fakeUserData.joinDate}
          </Text>
        </View>

        {/* Personal Information - Only show username, fullName, and phone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color="#FF4757" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tên đăng nhập</Text>
              <Text style={styles.infoValue}>{userData?.username || user?.username || fakeUserData.username}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={20} color="#FF4757" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Họ và tên</Text>
              <Text style={styles.infoValue}>{userData?.fullName || userData?.name || user?.name || fakeUserData.fullName}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="call" size={20} color="#FF4757" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>{userData?.phone || fakeUserData.phone}</Text>
            </View>
          </View>
        </View>


        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thống kê hoạt động</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{fakeUserData.stats.rescueRequests}</Text>
              <Text style={styles.statLabel}>Yêu cầu cứu hộ</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statSuccess]}>{fakeUserData.stats.completedRequests}</Text>
              <Text style={styles.statLabel}>Hoàn thành</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statWarning]}>{fakeUserData.stats.pendingRequests}</Text>
              <Text style={styles.statLabel}>Đang chờ</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statInfo]}>{fakeUserData.stats.volunteerHours}</Text>
              <Text style={styles.statLabel}>Giờ tình nguyện</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
            <Ionicons name="create" size={20} color="#2E91FF" />
            <Text style={styles.actionButtonText}>Chỉnh sửa hồ sơ</Text>
            <Ionicons name="chevron-forward" size={20} color="#A4B0BE" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
            <Ionicons name="lock-closed" size={20} color="#27AE60" />
            <Text style={styles.actionButtonText}>Đổi mật khẩu</Text>
            <Ionicons name="chevron-forward" size={20} color="#A4B0BE" />
          </TouchableOpacity>

        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2F3542',
  },
  headerRight: {
    width: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FF4757',
  },
  onlineStatus: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#27AE60',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2F3542',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#FF4757',
    fontWeight: '600',
    marginBottom: 8,
  },
  joinDate: {
    fontSize: 12,
    color: '#747D8C',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2F3542',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 12,
    width: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#747D8C',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#2F3542',
    fontWeight: '500',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F3542',
    marginBottom: 2,
  },
  contactRelation: {
    fontSize: 12,
    color: '#747D8C',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: '#27AE60',
    fontWeight: '500',
  },
  contactAction: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF4757',
    marginBottom: 4,
  },
  statSuccess: {
    color: '#27AE60',
  },
  statWarning: {
    color: '#F39C12',
  },
  statInfo: {
    color: '#2E91FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#747D8C',
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#2F3542',
    fontWeight: '500',
    marginLeft: 12,
  },
  logoutText: {
    color: '#FF4757',
  },
  
  // Loading and Error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#747D8C',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2F3542',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 14,
    color: '#747D8C',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2E91FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserProfile;
