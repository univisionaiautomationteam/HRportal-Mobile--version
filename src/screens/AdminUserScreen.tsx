import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import { adminAPI } from '../services/apiService';
import Button from '../components/Button';
import Card from '../components/Card';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShieldCheck, UserCheck, Trash2, Edit2, LogOut } from 'lucide-react-native';

export const AdminUserScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  
  /* Admin login state */
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  /* Form states */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('HR');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  /* Users data */
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    const checkAdminSession = async () => {
      const saved = await AsyncStorage.getItem('adminLoggedIn');
      if (saved === 'true') {
        setIsAdminLoggedIn(true);
        loadUsers();
      }
    };
    checkAdminSession();
  }, []);

  const handleAdminLogin = async () => {
    if (!adminUser || !adminPass) {
      Alert.alert('Missing Fields', 'Please enter your username and password.');
      return;
    }

    setLoginLoading(true);
    try {
      await adminAPI.login({ username: adminUser, password: adminPass });
      await AsyncStorage.setItem('adminLoggedIn', 'true');
      setIsAdminLoggedIn(true);
      loadUsers();
    } catch (err) {
      console.error('Admin login failed:', err);
      Alert.alert('Authentication Failed', 'Invalid admin credentials or server connection issue.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    await AsyncStorage.removeItem('adminLoggedIn');
    setIsAdminLoggedIn(false);
    setName('');
    setEmail('');
    setEditingId(null);
    setUsers([]);
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await adminAPI.getUsers();
      if (Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to load users from API:', err);
      Alert.alert('Error', 'Could not connect to the server to fetch HR staff.');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSaveUser = async () => {
    if (!name || !email) {
      Alert.alert('Missing Fields', 'Full Name and Email are required.');
      return;
    }

    setFormLoading(true);
    try {
      if (editingId) {
        await adminAPI.updateUser(editingId, { name, email, role });
        Alert.alert('Success', 'User updated successfully.');
      } else {
        await adminAPI.addUser({ name, email, role });
        Alert.alert('Success', 'User added successfully.');
      }
      resetForm();
      loadUsers();
    } catch (err) {
      console.error('Failed to save user:', err);
      Alert.alert('Error', 'Could not save user changes to the server.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSelect = (user: any) => {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
  };

  const handleDeleteUser = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this HR User?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await adminAPI.deleteUser(id);
            loadUsers();
          } catch (err) {
            console.error('Failed to delete user:', err);
            Alert.alert('Error', 'Could not delete user from server.');
          }
        }
      }
    ]);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setRole('HR');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!isAdminLoggedIn ? (
          /* ================= ADMIN LOGIN SCREEN ================= */
          <View style={styles.loginCenter}>
            <Card title="Admin Authorization" style={styles.loginCard}>
              <View style={styles.cardHeaderIcon}>
                <ShieldCheck color={theme.primary} size={42} />
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Username</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="Enter username"
                placeholderTextColor={theme.placeholder}
                value={adminUser}
                onChangeText={setAdminUser}
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Password</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="••••••••"
                placeholderTextColor={theme.placeholder}
                secureTextEntry
                value={adminPass}
                onChangeText={setAdminPass}
                autoCapitalize="none"
              />

              <Button
                label="Authenticate"
                onPress={handleAdminLogin}
                loading={loginLoading}
                style={styles.actionBtn}
              />

              <Button
                label="Back to Mobile Login"
                variant="outline"
                onPress={() => navigation.navigate('Login')}
                style={styles.actionBtn}
              />
            </Card>
          </View>
        ) : (
          /* ================= USER MANAGEMENT SYSTEM ================= */
          <View>
            <View style={styles.dashHeader}>
              <View>
                <Text style={[styles.dashTitle, { color: theme.text }]}>HR User Portal</Text>
                <Text style={[styles.dashSubtitle, { color: theme.textSecondary }]}>Admin Control Panel</Text>
              </View>
              <TouchableOpacity onPress={handleAdminLogout} style={[styles.logoutBtn, { borderColor: theme.danger }]}>
                <LogOut color={theme.danger} size={16} />
              </TouchableOpacity>
            </View>

            {/* Form Section */}
            <Card title={editingId ? 'Edit HR Account' : 'Register New HR Account'}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="Keerthana Murthy"
                placeholderTextColor={theme.placeholder}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="keerthana@univision.com"
                placeholderTextColor={theme.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>System Role</Text>
              <View style={styles.roleSelectGrid}>
                {['HR', 'HR Manager', 'Recruiter'].map((r) => {
                  const isSelected = role === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.rolePill,
                        { 
                          backgroundColor: isSelected ? theme.primary : theme.background,
                          borderColor: isSelected ? theme.primary : theme.border
                        }
                      ]}
                      onPress={() => setRole(r)}
                    >
                      <Text style={[styles.rolePillText, { color: isSelected ? '#ffffff' : theme.text }]}>{r}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.formActions}>
                <Button
                  label={editingId ? 'Update Account' : 'Create Account'}
                  onPress={handleSaveUser}
                  loading={formLoading}
                  style={styles.formSaveBtn}
                />
                {editingId && (
                  <Button
                    label="Cancel"
                    variant="outline"
                    onPress={resetForm}
                    style={styles.formCancelBtn}
                  />
                )}
              </View>
            </Card>

            {/* Table/List Section */}
            <Text style={[styles.listHeader, { color: theme.text }]}>Active HR Staff ({users.length})</Text>
            {users.map((u) => (
              <View key={u.id} style={[styles.userRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: theme.text }]}>{u.name}</Text>
                  <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{u.email}</Text>
                  <View style={[styles.badge, { backgroundColor: theme.primary + '15' }]}>
                    <Text style={[styles.badgeText, { color: theme.primary }]}>{u.role}</Text>
                  </View>
                </View>
                
                <View style={styles.userActions}>
                  <TouchableOpacity 
                    onPress={() => handleEditSelect(u)} 
                    style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                  >
                    <Edit2 color={theme.text} size={14} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => handleDeleteUser(u.id)} 
                    style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                  >
                    <Trash2 color={theme.danger} size={14} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
  scrollContent: {
    padding: 24,
  },
  loginCenter: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loginCard: {
    padding: 32,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 4,
  },
  cardHeaderIcon: {
    alignItems: 'center',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Times New Roman',
    marginBottom: 20,
  },
  actionBtn: {
    marginVertical: 8,
    height: 48,
  },
  dashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  dashTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  dashSubtitle: {
    fontSize: 14,
    fontFamily: 'Times New Roman',
    marginTop: 4,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleSelectGrid: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  rolePill: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  formSaveBtn: {
    flex: 1,
  },
  formCancelBtn: {
    flex: 1,
  },
  listHeader: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    marginTop: 32,
    marginBottom: 16,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
    paddingRight: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  userEmail: {
    fontSize: 13,
    fontFamily: 'Times New Roman',
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    textTransform: 'uppercase',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default AdminUserScreen;
