import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TeamHomeScreen from '../screens/team/TeamHomeScreen';
import NearbyRequestsScreen from '../screens/team/NearbyRequestsScreen';
import AssignedTaskScreen from '../screens/team/AssignedTaskScreen';
import AssignedTaskDetailScreen from '../screens/team/AssignedTaskDetailScreen';

const Stack = createNativeStackNavigator();

const RescueTeamStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RescueHome" component={TeamHomeScreen} />
      <Stack.Screen name="NearbyRequests" component={NearbyRequestsScreen} />
      <Stack.Screen name="AssignedMissions" component={AssignedTaskScreen} />
      <Stack.Screen name="AssignedTaskDetail" component={AssignedTaskDetailScreen} />
    </Stack.Navigator>
  );
};

export default RescueTeamStack;