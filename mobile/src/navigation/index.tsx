import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { RoomsScreen } from "../screens/RoomsScreen";
import { RoomScreen } from "../screens/RoomScreen";
import { CreateRoomScreen } from "../screens/CreateRoomScreen";
import { RandomChatScreen } from "../screens/RandomChatScreen";
import { WalletScreen } from "../screens/WalletScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { theme } from "../theme";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const screenTheme = {
  headerStyle: { backgroundColor: theme.colors.bg },
  headerTintColor: theme.colors.text,
  contentStyle: { backgroundColor: theme.colors.bg },
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textDim,
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{icons[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Rooms" component={RoomsScreen} />
      <Tab.Screen name="Chat" component={RandomChatScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const icons: Record<string, string> = { Rooms: "🎙️", Chat: "🔀", Wallet: "🪙", Profile: "👤" };

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={screenTheme}>
      <Stack.Screen name="Home" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Room" component={RoomScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateRoom" component={CreateRoomScreen} options={{ title: "New Room" }} />
    </Stack.Navigator>
  );
}
