import React, { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const LoginScreen = ({ navigation }) => {
  const { login, user } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (user) {
      navigation.goBack();
    }
  }, [user]);
  useEffect(() => {
    const t = setTimeout(() => {
      phoneRef.current?.focus?.();
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const validatePhone = (phoneNumber) => {
    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    return phoneRegex.test(phoneNumber);
  };

  const handleLogin = async (quickPhone = phone, quickPassword = password) => {
    if (!quickPhone || !quickPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại và mật khẩu');
      return;
    }

    if (!validatePhone(quickPhone)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: quickPhone,
          password: quickPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Lỗi đăng nhập',
          data?.message || 'Số điện thoại hoặc mật khẩu không đúng'
        );
        return;
      }

      login({
        ...data.user,
        token: data.token ?? data.access_token,
      });

    } catch (error) {
      Alert.alert(
        'Lỗi kết nối',
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.'
      );
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
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={80} color="#FF4757" />
          <Text style={styles.title}>Cứu Hộ Khẩn Cấp</Text>
          <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              ref={phoneRef}
              style={styles.input}
              placeholder="Số điện thoại"
              placeholderTextColor="#95a5a6"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={11}
              editable={!loading}
              showSoftInputOnFocus
              disableFullscreenUI
              onPressIn={() => phoneRef.current?.focus?.()}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Mật khẩu"
              placeholderTextColor="#95a5a6"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
              showSoftInputOnFocus
              disableFullscreenUI
              onPressIn={() => passwordRef.current?.focus?.()}
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

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={() => handleLogin()}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loadingText}>Đang đăng nhập...</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerButtonText}>Chưa có tài khoản? Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// styles giữ nguyên không đổi
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginTop: 20, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#7f8c8d', marginTop: 10, textAlign: 'center' },
  formContainer: { width: '100%' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa',
    borderRadius: 10, marginBottom: 20, paddingHorizontal: 15,
    height: 50, borderWidth: 1, borderColor: '#e9ecef',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: '100%', fontSize: 16, color: '#2c3e50' },
  eyeIcon: { padding: 5 },
  loginButton: {
    backgroundColor: '#FF4757', borderRadius: 10, height: 50,
    justifyContent: 'center', alignItems: 'center', marginBottom: 30,
  },
  loginButtonDisabled: { backgroundColor: '#ff6b81' },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  registerButton: { marginBottom: 24, alignItems: 'center' },
  registerButtonText: { color: '#FF4757', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});

export default LoginScreen;
