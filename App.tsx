import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Toast from 'react-native-toast-message';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';

// Auth Stack Screens
import LoginScreen from './src/screens/LoginScreen';
import Setup2FAScreen from './src/screens/Setup2FAScreen';
import OTPScreen from './src/screens/OTPScreen';
import AdminUserScreen from './src/screens/AdminUserScreen';

// HR Portal Tab Screens
import DashboardScreen from './src/screens/DashboardScreen';
import CandidatesListScreen from './src/screens/CandidatesListScreen';
import JobsScreen from './src/screens/JobsScreen';
import InterviewsListScreen from './src/screens/InterviewsListScreen';
import OffersListScreen from './src/screens/OffersListScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// HR Portal Detail Screens
import CandidateDetailScreen from './src/screens/CandidateDetailScreen';
import JobDetailScreen from './src/screens/JobDetailScreen';
import CreateJobScreen from './src/screens/CreateJobScreen';
import InterviewMonitoringScreen from './src/screens/InterviewMonitoringScreen';
import InterviewDetailsScreen from './src/screens/InterviewDetailsScreen';
import InterviewReportScreen from './src/screens/InterviewReportScreen';
import AIAssistantScreen from './src/screens/AIAssistantScreen';

// Candidate Experience Screens
import StartInterviewScreen from './src/screens/StartInterviewScreen';
import CandidateInterviewScreen from './src/screens/CandidateInterviewScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

import { LayoutDashboard, Users, Briefcase, Calendar, FileText, User } from 'lucide-react-native';

// Bottom Tabs for HR Portal
function HRPortalTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2f7df6',
        tabBarIcon: ({ color, size }) => {
          let IconComponent = LayoutDashboard;
          if (route.name === 'Dashboard') IconComponent = LayoutDashboard;
          else if (route.name === 'CandidatesTab') IconComponent = Users;
          else if (route.name === 'Jobs') IconComponent = Briefcase;
          else if (route.name === 'Interviews') IconComponent = Calendar;
          else if (route.name === 'Offers') IconComponent = FileText;
          else if (route.name === 'Profile') IconComponent = User;
          
          return <IconComponent color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="CandidatesTab" component={CandidatesListScreen} options={{ tabBarLabel: 'Candidates' }} />
      <Tab.Screen name="Jobs" component={JobsScreen} />
      <Tab.Screen name="Interviews" component={InterviewsListScreen} />
      <Tab.Screen name="Offers" component={OffersListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';

// Stack Navigator for the App
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
              {/* Auth Stack */}
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Setup2FA" component={Setup2FAScreen} />
              <Stack.Screen name="OTP" component={OTPScreen} />
              <Stack.Screen name="AdminUser" component={AdminUserScreen} />

              {/* Main HR Portal */}
              <Stack.Screen name="HRPortal" component={HRPortalTabs} />

              {/* Nested HR Portal Screens */}
              <Stack.Screen name="CandidateDetail" component={CandidateDetailScreen} />
              <Stack.Screen name="JobDetail" component={JobDetailScreen} />
              <Stack.Screen name="CreateJob" component={CreateJobScreen} />
              <Stack.Screen name="InterviewMonitoring" component={InterviewMonitoringScreen} />
              <Stack.Screen name="InterviewDetails" component={InterviewDetailsScreen} />
              <Stack.Screen name="InterviewReport" component={InterviewReportScreen} />
              <Stack.Screen name="AI" component={AIAssistantScreen} />

              {/* Candidate Experience Stack */}
              <Stack.Screen name="StartInterview" component={StartInterviewScreen} />
              <Stack.Screen name="CandidateInterview" component={CandidateInterviewScreen} />
            </Stack.Navigator>
          </NavigationContainer>
          <Toast />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
