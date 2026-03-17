import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RegisterScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'CITIZEN'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    type: '', // 'success' or 'error'
    title: '',
    message: '',
    buttonText: '',
    onPress: () => {}
  });

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Tên đăng nhập không được để trống';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Tên đăng nhập phải có ít nhất 3 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Mật khẩu không được để trống';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    // Fullname validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Họ tên không được để trống';
    } else if (formData.fullName.length < 2) {
      newErrors.fullName = 'Họ tên phải có ít nhất 2 ký tự';
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại không được để trống';
    } else if (!/^(0[3|5|7|8|9])+([0-9]{8})$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setModalData({
          type: 'success',
          title: ' Thành công',
          message: 'Tài khoản của bạn đã được tạo thành công!\n\nBây giờ bạn có thể đăng nhập để sử dụng các tính năng của ứng dụng.',
          buttonText: 'Đăng nhập ngay',
          onPress: () => navigation.navigate('Login')
        });
        setShowModal(true);
      } else {
        const errorMessage = Array.isArray(data.message)
          ? data.message.join('\n')
          : (data.message || 'Đăng ký thất bại. Vui lòng thử lại.');

        setModalData({
          type: 'error',
          title: 'Lỗi',
          message: errorMessage,
          buttonText: 'Thử lại',
          onPress: () => setShowModal(false)
        });
        setShowModal(true);
      }
    } catch (error) {
        setModalData({
          type: 'error',
          title: 'Lỗi kết nối',
          message: 'Không thể kết nối đến server. Vui lòng thử lại sau.',
          buttonText: 'Thử lại',
          onPress: () => setShowModal(false)
        });
        setShowModal(true);
        console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { 
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
            minHeight: '100%'
          }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons name="person-add" size={60} color="#FF4757" />
          <Text style={styles.title}>Đăng Ký Tài Khoản</Text>
          <Text style={styles.subtitle}>Tạo tài khoản mới để tiếp tục</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Fullname Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Họ và tên"
              placeholderTextColor="#95a5a6"
              value={formData.fullName}
              onChangeText={(text) => handleInputChange('fullName', text)}
              autoCapitalize="words"
            />
          </View>
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

          {/* Username Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="at" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Tên đăng nhập"
              placeholderTextColor="#95a5a6"
              value={formData.username}
              onChangeText={(text) => handleInputChange('username', text)}
              autoCapitalize="none"
            />
          </View>
          {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              placeholderTextColor="#95a5a6"
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
              keyboardType="phone-pad"
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu"
              placeholderTextColor="#95a5a6"
              value={formData.password}
              onChangeText={(text) => handleInputChange('password', text)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#95a5a6"
              />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Đăng ký</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Đã có tài khoản? <Text style={styles.loginLinkBold}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Custom Modal for Notifications */}
      {showModal && (
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            modalData.type === 'success' ? styles.modalSuccess : styles.modalError
          ]}>
            <Text style={styles.modalTitle}>{modalData.title}</Text>
            <Text style={styles.modalMessage}>{modalData.message}</Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                modalData.type === 'success' ? styles.modalButtonSuccess : styles.modalButtonError
              ]}
              onPress={() => {
                setShowModal(false);
                modalData.onPress();
              }}
            >
              <Text style={styles.modalButtonText}>{modalData.buttonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
    paddingTop: 10,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 15,
    textAlign: 'center',
    marginHorizontal: 20,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
    marginHorizontal: 30,
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    minWidth: '100%',
  },
  inputIcon: {
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#2c3e50',
    includeFontPadding: false,
    paddingVertical: 0,
    minHeight: 20,
  },
  eyeIcon: {
    padding: 6,
    marginLeft: 8,
  },
  errorText: {
    color: '#FF4757',
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 8,
    marginTop: 2,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#FF4757',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButtonDisabled: {
    backgroundColor: '#ff6b81',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loginLink: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 8,
  },
  loginLinkText: {
    color: '#7f8c8d',
    fontSize: 14,
    textAlign: 'center',
  },
  loginLinkBold: {
    color: '#FF4757',
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    minWidth: '80%',
    maxWidth: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  modalSuccess: {
    borderLeftWidth: 6,
    borderLeftColor: '#27ae60',
  },
  modalError: {
    borderLeftWidth: 6,
    borderLeftColor: '#e74c3c',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#2c3e50',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#7f8c8d',
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#FF4757',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
  },
  modalButtonSuccess: {
    backgroundColor: '#27ae60',
  },
  modalButtonError: {
    backgroundColor: '#e74c3c',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RegisterScreen;