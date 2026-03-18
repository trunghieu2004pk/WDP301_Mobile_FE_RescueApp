import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeStack from './HomeStack';
import RequestStatusScreen from '../screens/user/RequestStatusScreen';
import { NewsAlertsScreen, VolunteerScreen } from './PlaceholderScreens'; // ✅ đổi import
import RescueRequestDetailScreen from '../screens/user/RescueRequestDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
        tabBarActiveTintColor: '#E8293A',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
        name="Tình nguyện"
        component={VolunteerScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Tin tức"
        component={NewsAlertsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;