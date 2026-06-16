import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import { 
  Home, 
  Users, 
  Briefcase, 
  Calendar, 
  Sparkles, 
  FileText, 
  User as UserIcon,
  Lock
} from 'lucide-react-native';

/* Screens import */
import LoginScreen from '../screens/LoginScreen';
import OTPScreen from '../screens/OTPScreen';
import Setup2FAScreen from '../screens/Setup2FAScreen';
import AdminUserScreen from '../screens/AdminUserScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CandidatesListScreen from '../screens/CandidatesListScreen';
import CandidateDetailScreen from '../screens/CandidateDetailScreen';
import JobsScreen from '../screens/JobsScreen';
import CreateJobScreen from '../screens/CreateJobScreen';
import JobDetailScreen from '../screens/JobDetailScreen';
import InterviewsListScreen from '../screens/InterviewsListScreen';
import InterviewMonitoringScreen from '../screens/InterviewMonitoringScreen';
import InterviewDetailsScreen from '../screens/InterviewDetailsScreen';
import InterviewReportScreen from '../screens/InterviewReportScreen';
import OffersListScreen from '../screens/OffersListScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import ProfileScreen from '../screens/ProfileScreen';
import StartInterviewScreen from '../screens/StartInterviewScreen';
import CandidateInterviewScreen from '../screens/CandidateInterviewScreen';

/* Types for Stacks */
export type AuthStackParamList = {
  Login: undefined;
  Setup2FA: { userId: string; qrCode: string; manualKey: string };
  OTP: { userId: string };
  AdminUser: undefined;
  StartInterview: undefined;
  CandidateInterview: { sessionId: string };
  AppTabs: undefined;
};

export type CandidateStackParamList = {
  CandidatesList: undefined;
  CandidateDetail: { id: string };
};

export type JobStackParamList = {
  JobsList: undefined;
  CreateJob: undefined;
  JobDetail: { position: string };
};

export type InterviewStackParamList = {
  InterviewsList: undefined;
  InterviewMonitoring: undefined;
  InterviewDetails: { sessionId: string };
  InterviewReport: { sessionId: string };
};

export type AppTabParamList = {
  Dashboard: undefined;
  CandidatesTab: undefined;
  JobsTab: undefined;
  InterviewsTab: undefined;
  AI: undefined;
  Offers: undefined;
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const CandidateStack = createNativeStackNavigator<CandidateStackParamList>();
const JobStack = createNativeStackNavigator<JobStackParamList>();
const InterviewStack = createNativeStackNavigator<InterviewStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

/* Candidate Navigator Stack */
const CandidateNavigator = () => {
  const { theme } = useTheme();
  return (
    <CandidateStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <CandidateStack.Screen 
        name="CandidatesList" 
        component={CandidatesListScreen} 
        options={{ title: 'Candidates' }}
      />
      <CandidateStack.Screen 
        name="CandidateDetail" 
        component={CandidateDetailScreen} 
        options={{ title: 'Candidate Profile' }}
      />
    </CandidateStack.Navigator>
  );
};

/* Job Navigator Stack */
const JobNavigator = () => {
  const { theme } = useTheme();
  return (
    <JobStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <JobStack.Screen 
        name="JobsList" 
        component={JobsScreen} 
        options={{ title: 'Job Openings' }}
      />
      <JobStack.Screen 
        name="CreateJob" 
        component={CreateJobScreen} 
        options={{ title: 'Create Job' }}
      />
      <JobStack.Screen 
        name="JobDetail" 
        component={JobDetailScreen} 
        options={{ title: 'Job Insights' }}
      />
    </JobStack.Navigator>
  );
};

/* Interview Navigator Stack */
const InterviewNavigator = () => {
  const { theme } = useTheme();
  return (
    <InterviewStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <InterviewStack.Screen
        name="InterviewsList"
        component={InterviewsListScreen}
        options={{ title: 'Interviews' }}
      />
      <InterviewStack.Screen
        name="InterviewMonitoring"
        component={InterviewMonitoringScreen}
        options={{ title: 'Live Monitoring' }}
      />
      <InterviewStack.Screen
        name="InterviewDetails"
        component={InterviewDetailsScreen}
        options={{ title: 'Session Details' }}
      />
      <InterviewStack.Screen
        name="InterviewReport"
        component={InterviewReportScreen}
        options={{ title: 'Assessment Report' }}
      />
    </InterviewStack.Navigator>
  );
};

/* Primary Application Bottom Tabs */
const TabNavigator = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
        },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="CandidatesTab"
        component={CandidateNavigator}
        options={{
          title: 'Candidates',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="JobsTab"
        component={JobNavigator}
        options={{
          title: 'Jobs',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="InterviewsTab"
        component={InterviewNavigator}
        options={{
          title: 'Interviews',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AI"
        component={AIAssistantScreen}
        options={{
          title: 'AI Spark',
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Offers"
        component={OffersListScreen}
        options={{
          title: 'Offers',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

/* Core Entry Navigator resolving based on auth state */
export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return null; // A custom splash spinner is handled in App.tsx
  }

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <AuthStack.Screen name="AppTabs" component={TabNavigator} />
      ) : (
        <>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Setup2FA" component={Setup2FAScreen} />
          <AuthStack.Screen name="OTP" component={OTPScreen} />
          <AuthStack.Screen name="AdminUser" component={AdminUserScreen} />
          <AuthStack.Screen name="StartInterview" component={StartInterviewScreen} />
          <AuthStack.Screen name="CandidateInterview" component={CandidateInterviewScreen} />
        </>
      )}
    </AuthStack.Navigator>
  );
};
export default AppNavigator;
