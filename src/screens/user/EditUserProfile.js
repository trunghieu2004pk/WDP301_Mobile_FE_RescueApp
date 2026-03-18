import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const EditUserProfile = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user, updateUser, getAuthHeaders } = useAuth();

  // Get user data from route params or use current user data
  const userData = route.params?.userData || user;

  const [formData, setFormData] = useState({
    username: userData?.username || '',
    fullName: userData?.name || '',
    phone: userData?.phone || '',
    avatar: userData?.avatar || ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ type: 'success', title: '', message: '', onPress: () => setShowModal(false) });

  const validateForm = () => {
    const newErrors = {};

    // Validate full name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Họ tên không được để trống';
    }

    // Validate phone
    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại không được để trống';
    } else if (!/^(0[3|5|7|8|9])+([0-9]{8})$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    if (formData.avatar && typeof formData.avatar === 'string') {
      const isUrl = /^https?:\/\//i.test(formData.avatar) || formData.avatar.startsWith('file://');
      if (!isUrl) {
        newErrors.avatar = 'Liên kết ảnh không hợp lệ';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          avatar: formData.avatar || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.message || `Lỗi ${response.status}: Không thể cập nhật hồ sơ`;
        throw new Error(message);
      }

      const updated = data?.data ?? data ?? {};
      updateUser({
        name: updated.name || updated.fullName || formData.fullName,
        fullName: updated.fullName || updated.name || formData.fullName,
        phone: updated.phone || formData.phone,
        avatar: updated.avatar ?? formData.avatar ?? user?.avatar,
      });

      setModalData({
        type: 'success',
        title: 'Thành công',
        message: 'Thông tin cá nhân đã được cập nhật!',
        onPress: () => { setShowModal(false); navigation.goBack(); }
      });
      setShowModal(true);
    } catch (error) {
      setModalData({
        type: 'error',
        title: 'Lỗi',
        message: error.message || 'Có lỗi xảy ra khi cập nhật thông tin',
        onPress: () => setShowModal(false),
      });
      setShowModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const pickAvatarImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Cần quyền truy cập thư viện ảnh để chọn ảnh đại diện');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormData(prev => ({
          ...prev,
          avatar: result.assets[0].uri
        }));
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const takeAvatarPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Cần quyền truy cập camera để chụp ảnh');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormData(prev => ({
          ...prev,
          avatar: result.assets[0].uri
        }));
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chụp ảnh');
    }
  };

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
      >

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatarImage}>
              <View style={styles.avatarContainer}>
                {formData.avatar ? (
                  <Image
                    source={{ uri: formData.avatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={40} color="#747D8C" />
                  </View>
                )}
                <View style={styles.avatarOverlay}>
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
            
            <Text style={styles.avatarLabel}>Ảnh đại diện</Text>
            
            <View style={styles.avatarButtons}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={pickAvatarImage}
              >
                <Ionicons name="images" size={16} color="#2E91FF" />
                <Text style={styles.avatarButtonText}>Chọn ảnh</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={takeAvatarPhoto}
              >
                <Ionicons name="camera" size={16} color="#27AE60" />
                <Text style={styles.avatarButtonText}>Chụp ảnh</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Username Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên đăng nhập</Text>
            <TextInput
              style={[styles.input, errors.username && styles.inputError]}
              value={formData.username}
              editable={false}
              placeholder="Nhập tên đăng nhập"
              placeholderTextColor="#A4B0BE"
              autoCapitalize="none"
            />
          </View>

          {/* Full Name Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và tên</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              value={formData.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
              placeholder="Nhập họ và tên"
              placeholderTextColor="#A4B0BE"
            />
            {errors.fullName && (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            )}
          </View>

          {/* Phone Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#A4B0BE"
              keyboardType="phone-pad"
            />
            {errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      
      {showModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconWrap, modalData.type === 'success' ? { backgroundColor: '#E8FFF1' } : { backgroundColor: '#FFF0F1' }]}>
              <Ionicons name={modalData.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={36} color={modalData.type === 'success' ? '#27AE60' : '#FF4757'} />
            </View>
            <Text style={styles.modalTitle}>{modalData.title}</Text>
            <Text style={styles.modalMessage}>{modalData.message}</Text>
            <TouchableOpacity style={[styles.modalConfirmBtn, modalData.type === 'success' ? { backgroundColor: '#27AE60' } : { backgroundColor: '#FF4757' }]} onPress={modalData.onPress}>
              <Text style={styles.modalConfirmText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    marginBottom: 32,
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
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F3542',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2F3542',
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  inputError: {
    borderColor: '#FF4757',
  },
  errorText: {
    fontSize: 12,
    color: '#FF4757',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#FF4757',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#FFA8A8',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FF4757',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F9FA',
    borderWidth: 3,
    borderColor: '#E0E6ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F3542',
    marginBottom: 12,
  },
  avatarButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E6ED',
    gap: 6,
  },
  avatarButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2F3542',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3542',
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 14,
    color: '#57606F',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalConfirmBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default EditUserProfile;
