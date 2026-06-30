import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Alert, TouchableOpacity, TextInput, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import { profileAPI, resumesAPI } from '../services/apiService';
import { formatDate } from '../utils';
import Button from '../components/Button';
import Card from '../components/Card';
import {
    User,
    Mail,
    Shield,
    Moon,
    Activity,
    ArrowRight,
    FileText,
    Search,
    Download,
    LogOut,
    TrendingUp
} from 'lucide-react-native';

export const ProfileScreen = () => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"profile" | "resumes" | "status">("profile");
  const [loading, setLoading] = useState(false);

  // Resume state
  const [resumeUpdates, setResumeUpdates] = useState<any[]>([]);
  const [resumeSearch, setResumeSearch] = useState("");

  // Status activity state
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const loadProfileData = async () => {
    setLoading(true);
    try {
        if (activeTab === "resumes") {
            const res = await resumesAPI.getAllUpdates();
            setResumeUpdates(res.data || []);
        } else if (activeTab === "status") {
            const res = await profileAPI.getStatusActivity();
            setStatusLogs(res.data || []);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [activeTab]);

  const handleLogoutPress = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out of the HR Dashboard?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout }
    ]);
  };

  const handleDownload = async (resumeId: string) => {
    try {
      const res = await resumesAPI.download(resumeId);
      const downloadUrl = res.data.downloadUrl;
      if (downloadUrl) {
          Linking.openURL(downloadUrl);
      } else {
          Alert.alert("Error", "No download URL received");
      }
    } catch (err) {
      Alert.alert("Error", "Download failed");
    }
  };

  const filteredResumes = useMemo(() => {
    const s = resumeSearch.toLowerCase();
    return resumeUpdates.filter(item =>
        item.candidate_name?.toLowerCase().includes(s) ||
        item.updated_by_name?.toLowerCase().includes(s)
    );
  }, [resumeUpdates, resumeSearch]);

  const filteredLogs = useMemo(() => {
    return statusFilter === "all" ? statusLogs : statusLogs.filter(log => log.status === statusFilter);
  }, [statusLogs, statusFilter]);

  const statusSummary = useMemo(() => {
    return statusLogs.reduce((acc: any, log: any) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {});
  }, [statusLogs]);

  const renderTabBtn = (id: typeof activeTab, label: string, icon: any) => (
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === id && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
        onPress={() => setActiveTab(id)}
      >
        <Text style={[styles.tabText, { color: activeTab === id ? theme.primary : theme.textSecondary }]}>{label}</Text>
      </TouchableOpacity>
  );

  const firstLetter = (user?.name || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>My Profile</Text>
          <TouchableOpacity onPress={handleLogoutPress}>
              <LogOut size={20} color={theme.danger} />
          </TouchableOpacity>
      </View>

      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
          {renderTabBtn("profile", "Profile", null)}
          {renderTabBtn("resumes", `Resumes (${resumeUpdates.length})`, null)}
          {renderTabBtn("status", `Status (${statusLogs.length})`, null)}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === "profile" && (
            <View>
                <View style={[styles.profileHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={[styles.avatar, { backgroundColor: theme.primary + '18' }]}>
                        <Text style={[styles.avatarText, { color: theme.primary }]}>{firstLetter}</Text>
                    </View>
                    <Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text>
                    <View style={[styles.badge, { backgroundColor: theme.primary + '12' }]}>
                        <Text style={[styles.badgeText, { color: theme.primary }]}>{user?.role || 'HR Specialist'}</Text>
                    </View>
                    <Text style={[styles.email, { color: theme.textSecondary }]}>{user?.email || 'No Email'}</Text>
                </View>

                <Card title="Preferences">
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <Moon color={theme.primary} size={20} />
                            <Text style={[styles.settingTitle, { color: theme.text, marginLeft: 12 }]}>Dark Mode</Text>
                        </View>
                        <Switch
                            trackColor={{ false: theme.border, true: theme.primary + '80' }}
                            thumbColor={isDarkMode ? theme.primary : '#f4f3f4'}
                            onValueChange={toggleTheme}
                            value={isDarkMode}
                        />
                    </View>
                </Card>

                <Button
                    label="Logout"
                    variant="danger"
                    onPress={handleLogoutPress}
                    style={styles.logoutBtn}
                />
            </View>
        )}

        {activeTab === "resumes" && (
            <View>
                <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                    <Search size={18} color={theme.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search resumes..."
                        placeholderTextColor={theme.placeholder}
                        value={resumeSearch}
                        onChangeText={setResumeSearch}
                    />
                </View>

                {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} /> : (
                    filteredResumes.map(item => (
                        <View key={item.id} style={[styles.resumeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.resumeCandidate, { color: theme.text }]}>👤 {item.candidate_name}</Text>
                                <Text style={[styles.resumeMeta, { color: theme.textSecondary }]}>Updated by: {item.updated_by_name}</Text>
                                <Text style={[styles.resumeMeta, { color: theme.textSecondary }]}>🕒 {formatDate(item.created_at)}</Text>
                            </View>
                            <TouchableOpacity style={[styles.downloadBtn, { backgroundColor: theme.primary }]} onPress={() => handleDownload(item.id)}>
                                <Download size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </View>
        )}

        {activeTab === "status" && (
            <View>
                <View style={[styles.summaryBox, { backgroundColor: theme.info + '10', borderColor: theme.info }]}>
                    <View style={styles.summaryHeader}>
                        <TrendingUp size={20} color={theme.info} />
                        <Text style={[styles.summaryTitle, { color: theme.text }]}>Activity Overview</Text>
                    </View>
                    <View style={styles.metricsGrid}>
                        {Object.entries(statusSummary).map(([status, count]: any) => (
                            <View key={status} style={[styles.metricCard, { backgroundColor: theme.surface }]}>
                                <Text style={[styles.metricCount, { color: theme.primary }]}>{count}</Text>
                                <Text style={[styles.metricLabel, { color: theme.textSecondary }]} numberOfLines={1}>{status.replace('_', ' ').toUpperCase()}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} /> : (
                    filteredLogs.map(log => (
                        <View key={log.id} style={[styles.logCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <View style={styles.logHeader}>
                                <Text style={[styles.logCandidate, { color: theme.text }]}>👤 {log.first_name} {log.last_name}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: theme.primary + '20' }]}>
                                    <Text style={[styles.statusBadgeText, { color: theme.primary }]}>{log.status.replace('_', ' ')}</Text>
                                </View>
                            </View>
                            <Text style={[styles.logDate, { color: theme.textSecondary }]}>🕒 {formatDate(log.created_at)}</Text>
                        </View>
                    ))
                )}
            </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: SIZES.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    ...TYPOGRAPHY.h2,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SIZES.md,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Times New Roman'
  },
  scrollContent: {
    padding: SIZES.lg,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    padding: SIZES.xl,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    marginBottom: SIZES.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
  },
  name: {
    ...TYPOGRAPHY.h2,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  email: {
    ...TYPOGRAPHY.body,
    marginTop: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    ...TYPOGRAPHY.bodyMedium,
  },
  logoutBtn: {
    marginTop: SIZES.xl,
  },
  searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: SIZES.radiusMd,
      paddingHorizontal: SIZES.md,
      height: 44,
      marginBottom: SIZES.lg
  },
  searchInput: {
      flex: 1,
      marginLeft: 10,
      ...TYPOGRAPHY.body
  },
  resumeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SIZES.md,
      borderRadius: SIZES.radiusMd,
      borderWidth: 1,
      marginBottom: SIZES.sm
  },
  resumeCandidate: {
      ...TYPOGRAPHY.bodyMedium,
      fontWeight: '700'
  },
  resumeMeta: {
      fontSize: 12,
      marginTop: 2
  },
  downloadBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center'
  },
  summaryBox: {
      padding: SIZES.md,
      borderRadius: SIZES.radiusLg,
      borderWidth: 1,
      marginBottom: SIZES.lg
  },
  summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: SIZES.md
  },
  summaryTitle: {
      ...TYPOGRAPHY.bodyMedium,
      fontWeight: '700'
  },
  metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8
  },
  metricCard: {
      flex: 1,
      minWidth: '30%',
      padding: 10,
      borderRadius: SIZES.radiusMd,
      alignItems: 'center'
  },
  metricCount: {
      fontSize: 18,
      fontWeight: '800'
  },
  metricLabel: {
      fontSize: 9,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 2
  },
  logCard: {
      padding: SIZES.md,
      borderRadius: SIZES.radiusMd,
      borderWidth: 1,
      marginBottom: SIZES.sm
  },
  logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
  },
  logCandidate: {
      ...TYPOGRAPHY.bodyMedium,
      fontWeight: '700'
  },
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10
  },
  statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase'
  },
  logDate: {
      fontSize: 11,
      marginTop: 6
  }
});
export default ProfileScreen;
