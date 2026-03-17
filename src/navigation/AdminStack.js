import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';

const Stack = createNativeStackNavigator();

const AdminStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="AdminMain"
      component={AdminHomeScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

export default AdminStack;