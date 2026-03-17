import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser]           = useState(null);
  const [token, setToken]         = useState(null); // ← lưu access token

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const [userData, savedToken] = await Promise.all([
        AsyncStorage.getItem('userData'),
        AsyncStorage.getItem('accessToken'),
      ]);

      if (!userData || !savedToken) {
        // Chưa từng đăng nhập
        return;
      }

      // Kiểm tra token còn hạn hay không
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/auth/check-token`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${savedToken}`,
          },
        }
      );

      if (response.ok) {
        // Token còn hợp lệ → khôi phục session
        setUser(JSON.parse(userData));
        setToken(savedToken);
      } else {
        // Token hết hạn → xóa sạch, về trạng thái khách
        await Promise.all([
          AsyncStorage.removeItem('userData'),
          AsyncStorage.removeItem('accessToken'),
        ]);
      }
    } catch (error) {
      // Lỗi mạng → vẫn giữ session cũ, không logout
      console.warn('Không thể kiểm tra token, giữ session hiện tại:', error);
      const [userData, savedToken] = await Promise.all([
        AsyncStorage.getItem('userData'),
        AsyncStorage.getItem('accessToken'),
      ]).catch(() => [null, null]);

      if (userData && savedToken) {
        setUser(JSON.parse(userData));
        setToken(savedToken);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Được gọi từ LoginScreen sau khi API trả về thành công
  const login = async (userData) => {
    try {
      const { token: accessToken, ...userInfo } = userData;
      await Promise.all([
        AsyncStorage.setItem('userData', JSON.stringify(userInfo)),
        AsyncStorage.setItem('accessToken', accessToken ?? ''),
      ]);
      setToken(accessToken ?? null);
      setUser(userInfo);
    } catch (error) {
      console.error('Error saving login data:', error);
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('userData'),
        AsyncStorage.removeItem('accessToken'),
      ]);
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  // Helper: tạo headers có Authorization sẵn cho các API call khác
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
};