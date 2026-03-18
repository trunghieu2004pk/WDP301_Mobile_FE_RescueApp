import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/user/HomeScreen';
import LoginScreen from '../screens/login/LoginScreen';
import RegisterScreen from '../screens/login/RegisterScreen';
import RescueRequestScreen from '../screens/user/RescueRequestScreen';
import RequestStatusScreen from '../screens/user/RequestStatusScreen';
import RescueRequestDetailScreen from '../screens/user/RescueRequestDetailScreen';
import AssignedTaskScreen from '../screens/team/AssignedTaskScreen';
import AssignedTaskDetailScreen from '../screens/team/AssignedTaskDetailScreen';
import UserProfile from '../screens/user/UserProfile';
import EditUserProfile from '../screens/user/EditUserProfile';
import ChangePassword from '../screens/user/ChangePassword';

import {
  DangerMapScreen,
  RescueContactScreen,
  VolunteerScreen,
  NewsAlertsScreen,
  StatisticsScreen,
  DonateScreen,
} from './PlaceholderScreens';

const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="HomeMain"
      component={HomeScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{ title: 'Đăng nhập' }}
    />
    <Stack.Screen
      name="Register"
      component={RegisterScreen}
      options={{ title: 'Đăng ký tài khoản' }}
    />
    <Stack.Screen
      name="UserProfile"
      component={UserProfile}
      options={{ title: 'Hồ sơ người dùng' }}
    />
    <Stack.Screen
      name="EditProfile"
      component={EditUserProfile}
      options={{ title: 'Chỉnh sửa hồ sơ' }}
    />
    <Stack.Screen
      name="ChangePassword"
      component={ChangePassword}
      options={{ title: 'Đổi mật khẩu' }}
    />
    <Stack.Screen
      name="EmergencyReport"
      component={RescueRequestScreen}
      options={{ title: 'Gửi yêu cầu cứu hộ' }}
    />
    <Stack.Screen
      name="RequestStatus"
      component={RequestStatusScreen}
      options={{ title: 'Trạng thái cứu hộ' }}
    />
    <Stack.Screen
      name="DangerMap"
      component={DangerMapScreen}
      options={{ title: 'Bản đồ nguy hiểm' }}
    />
    <Stack.Screen
      name="RescueContact"
      component={RescueContactScreen}
      options={{ title: 'Liên hệ cứu hộ' }}
    />
    <Stack.Screen
      name="Donate"
      component={DonateScreen}
      options={{ title: 'Quyên góp' }}
    />
    <Stack.Screen
      name="NewsAlerts"
      component={NewsAlertsScreen}
      options={{ title: 'Tin tức & Cảnh báo' }}
    />
    <Stack.Screen
      name="Statistics"
      component={StatisticsScreen}
      options={{ title: 'Kỹ năng sinh tồn' }}
    />
  </Stack.Navigator>
);

export default HomeStack;
