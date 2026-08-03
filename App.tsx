import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RootStackParamList, TabParamList } from './src/navigation/types';
import { AddTaskScreen } from './src/screens/AddTaskScreen';
import { KanbanScreen } from './src/screens/KanbanScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';
import { BoardProvider } from './src/store/BoardContext';
import { colors } from './src/theme';

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.accent,
  },
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Kanban"
        component={KanbanScreen}
        options={{
          title: 'ボード',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="albums-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BoardProvider>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar style="light" />
            <Stack.Navigator
              screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTitleStyle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
                headerTintColor: colors.accent,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
              <Stack.Screen
                name="TaskDetail"
                component={TaskDetailScreen}
                options={{ title: 'タスクの詳細' }}
              />
              <Stack.Screen
                name="AddTask"
                component={AddTaskScreen}
                options={{ title: '新しいタスク', presentation: 'modal' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </BoardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
