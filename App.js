import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';

import TabNavigator from './src/navigation/TabNavigator';
import AdminStack from './src/navigation/AdminStack';
import CoordinatorStack from './src/navigation/CoordinatorStack';
import RescueTeamStack from './src/navigation/RescueTeamStack';

// AppContent: điều hướng theo role sau khi auth
const AppContent = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Đang tải...</Text>
      </View>
    );
  }

  const renderStack = () => {
    switch (user?.role) {
      case 'ADMIN':
        return <AdminStack />;
      case 'COORDINATOR':
        return <CoordinatorStack />;
      case 'RESCUE_TEAM':
        return <RescueTeamStack />;
      default:
        return <TabNavigator />;
    }
  };

  return (
    <NavigationContainer>
      {renderStack()}
    </NavigationContainer>
  );
};

// Root component
const MainApp = () => (
  <SafeAreaProvider>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </SafeAreaProvider>
);

export default MainApp;