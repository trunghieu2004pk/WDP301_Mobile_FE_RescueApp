import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeStack from './HomeStack';
import RequestStatusScreen from '../screens/user/RequestStatusScreen';
import { DangerMapScreen, NewsAlertsScreen } from './PlaceholderScreens';
import RescueRequestDetailScreen from '../screens/user/RescueRequestDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack riêng cho tab Trạng thái để có thể navigate sang chi tiết
const StatusStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="RequestStatusMain"
      component={RequestStatusScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="RescueRequestDetail"
      component={RescueRequestDetailScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const TabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FF4757',
        tabBarInactiveTintColor: '#95a5a6',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#ecf0f1',
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Trang chủ"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Trạng thái"
        component={StatusStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Bản đồ"
        component={DangerMapScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tin tức"
        component={NewsAlertsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;