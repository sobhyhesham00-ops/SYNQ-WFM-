import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "./src/store/auth";
import { AuthScreen } from "./src/screens/AuthScreen";
import { RootNavigator } from "./src/navigation";
import { theme } from "./src/theme";

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: theme.colors.bg, card: theme.colors.surface, text: theme.colors.text, primary: theme.colors.primary },
};

export default function App() {
  const token = useAuth((s) => s.token);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {token ? (
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      ) : (
        <AuthScreen />
      )}
    </SafeAreaProvider>
  );
}
