import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CoordinatorHomeScreen from '../screens/coordinator/CoordinatorHomeScreen';
import RequestListScreen from '../screens/coordinator/RequestListScreen';
import RequestDetailScreen from '../screens/coordinator/RequestDetailScreen';
import TeamListScreen from '../screens/coordinator/TeamListScreen';
import TeamDetailScreen from '../screens/coordinator/TeamDetailScreen';
import UpdateTeam from '../screens/coordinator/UpdateTeam';

const Stack = createNativeStackNavigator();

const CoordinatorStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="CoordinatorMain"
      component={CoordinatorHomeScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="RequestList"
      component={RequestListScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="RequestDetail"
      component={RequestDetailScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="TeamList"
      component={TeamListScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="TeamDetail"
      component={TeamDetailScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="UpdateTeam"
      component={UpdateTeam}
      options={{ headerShown: false }}
    />   
  </Stack.Navigator>
);

export default CoordinatorStack;