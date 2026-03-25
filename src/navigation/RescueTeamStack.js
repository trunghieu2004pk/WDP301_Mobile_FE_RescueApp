import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TeamHomeScreen from '../screens/team/TeamHomeScreen';
import NearbyRequestsScreen from '../screens/team/NearbyRequestsScreen';
import AssignedTaskScreen from '../screens/team/AssignedTaskScreen';
import AssignedTaskDetailScreen from '../screens/team/AssignedTaskDetailScreen';
import TeamDetail from '../screens/team/TeamDetail';
import VehicleListScreen from '../screens/coordinator/VehicleListScreen';

const Stack = createNativeStackNavigator();

const RescueTeamStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RescueHome" component={TeamHomeScreen} />
      <Stack.Screen name="NearbyRequests" component={NearbyRequestsScreen} />
      <Stack.Screen name="AssignedMissions" component={AssignedTaskScreen} />
      <Stack.Screen name="AssignedTaskDetail" component={AssignedTaskDetailScreen} />
      <Stack.Screen name="TeamDetail" component={TeamDetail} />
      <Stack.Screen name="VehicleList" component={VehicleListScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default RescueTeamStack;
