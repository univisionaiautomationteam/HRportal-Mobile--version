import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import { candidatesAPI } from '../services/apiService';
import Button from '../components/Button';
import Card from '../components/Card';
import { Search, Plus, Filter, ArrowUpDown, UserCheck, FileText, ChevronRight, X } from 'lucide-react-native';

export const CandidatesListScreen = ({ navigation }: any) => {
  const { theme } = useTheme();

  /* State sets */
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* Search & Filter states */
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  /* Register Candidate form states */
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email_id: '',
    phone_number: '',
    alternate_mobile_number: '',
    skills: '',
    custom_overall_experience_years: '',
    education: '',
    position: '',
    offer_in_hand: '',
    variable_pay_details: '',
    rsu_details: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const res = await candidatesAPI.getAll();
      if (Array.isArray(res.data)) {
  setCandidates(res.data);
}
    } catch (err) {
      console.error('Failed to load candidates from API:', err);
      Alert.alert('Error', 'Could not connect to the server to fetch candidates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCandidates();
    setRefreshing(false);
  };

  const handleAddCandidate = async () => {
    if (!formData.first_name || !formData.email_id || !formData.phone_number || !formData.position) {
      Alert.alert('Missing Info', 'First name, Email, Phone, and Position are required fields.');
      return;
    }

    setFormLoading(true);
    try {
      const res = await candidatesAPI.create(formData);
      Alert.alert('Registered', 'Candidate registration completed successfully.');
      setShowAddModal(false);
      clearForm();
      loadCandidates();
    } catch (err) {
      console.error('Failed to register candidate:', err);
      Alert.alert('Error', 'Could not register candidate on the server.');
    } finally {
      setFormLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email_id: '',
      phone_number: '',
      alternate_mobile_number: '',
      skills: '',
      custom_overall_experience_years: '',
      education: '',
      position: '',
      offer_in_hand: '',
      variable_pay_details: '',
      rsu_details: ''
    });
  };

  const filteredCandidates = useMemo(() => {
    let list = [...candidates];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.first_name + ' ' + c.last_name).toLowerCase().includes(q) ||
          c.position?.toLowerCase().includes(q) ||
          c.email_id?.toLowerCase().includes(q) ||
          c.phone_number?.includes(q)
      );
    }

    if (stageFilter !== 'all') {
      list = list.filter((c) => c.status === stageFilter);
    }

    if (ownerFilter !== 'all') {
      list = list.filter((c) => (c.owner_name || c.created_by_name) === ownerFilter);
    }

    list.sort((a, b) => {
      if (sortField === 'name') {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      } else {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });

    return list;
  }, [candidates, search, stageFilter, ownerFilter, sortField, sortOrder]);

  const owners = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => {
      const name = c.owner_name || c.created_by_name;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [candidates]);

  const toggleSort = (field: 'name' | 'date') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'applied':
        return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
      case 'screening_pending':
        return { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
      case 'screening_selected':
        return { bg: '#ECFDF5', text: '#059669', border: '#6EE7B7' };
      case 'screening_rejected':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' };
      case 'l1_scheduled':
      case 'l2_scheduled':
        return { bg: '#FEF3C7', text: '#EA580C', border: '#FCD34D' };
      case 'l1_select':
      case 'l2_select':
        return { bg: '#ECFDF5', text: '#059669', border: '#6EE7B7' };
      case 'l1_reject':
      case 'l2_reject':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' };
      case 'shared_to_client':
        return { bg: '#F3E8FF', text: '#7C3AED', border: '#D8B4FE' };
      case 'hr_round':
        return { bg: '#ECFDF5', text: '#0891B2', border: '#06B6D4' };
      case 'col_issued':
        return { bg: '#F3E8FF', text: '#7C3AED', border: '#D8B4FE' };
      case 'fol_issued':
        return { bg: '#FEF3C7', text: '#EA580C', border: '#FCD34D' };
      case 'joined':
        return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' };
      default:
        return { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
    }
  };

  const mapStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      applied: 'Applied',
      screening_pending: 'Screening Pending',
      screening_selected: 'Screening Selected',
      l1_scheduled: 'L1 Scheduled',
      l1_select: 'L1 Select',
      l2_scheduled: 'L2 Scheduled',
      l2_select: 'L2 Select',
      col_issued: 'COL Issued',
      fol_issued: 'FOL Issued',
      joined: 'Joined',
    };
    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  };

  if (loading && !candidates.length) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Header */}
      <View style={[styles.searchBarRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Search color={theme.textSecondary} size={18} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search candidate name, email, role..."
            placeholderTextColor={theme.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X color={theme.textSecondary} size={18} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity 
          style={[styles.iconBtn, { borderColor: theme.border }]} 
          onPress={() => setShowFiltersModal(true)}
        >
          <Filter color={theme.primary} size={18} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Plus color="#ffffff" size={18} />
        </TouchableOpacity>
      </View>

      {/* Sorting bar */}
      <View style={styles.sortBar}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => toggleSort('date')}>
          <Text style={[styles.sortText, { color: theme.textSecondary }]}>
            Date Created {sortField === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortBtn} onPress={() => toggleSort('name')}>
          <Text style={[styles.sortText, { color: theme.textSecondary }]}>
            Alphabetical {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Candidates List */}
      <FlatList
        data={filteredCandidates}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const colors = getStatusStyle(item.status);
          return (
            <TouchableOpacity 
              activeOpacity={0.7}
              style={[
                styles.itemCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderLeftColor: colors.text,
                  borderLeftWidth: 4
                }
              ]}
              onPress={() => navigation.navigate('CandidateDetail', { id: item.id })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.first_name || 'C')[0].toUpperCase()}</Text>
                </View>
                <View style={styles.cardHeaderLeft}>
                  <Text style={[styles.itemName, { color: theme.text }]}>
                    {item.first_name} {item.last_name}
                  </Text>
                  <Text style={[styles.itemRole, { color: theme.textSecondary }]}>{item.position}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }]}>
                  <Text style={[styles.statusBadgeText, { color: colors.text }]}>
                    {mapStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardInfo}>
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>📧 {item.email_id || item.email || '-'}</Text>
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>📱 {item.phone_number || item.phone || '-'}</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.cardFooter}>
                <View style={styles.footerRow}>
                  <UserCheck color={theme.textSecondary} size={14} />
                  <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                    Owner: {item.owner_name || item.created_by_name || 'Unassigned'}
                  </Text>
                </View>
                <ChevronRight color={theme.textSecondary} size={18} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyCenter}>
            <Text style={{ color: theme.textSecondary, fontFamily: 'Times New Roman' }}>No candidates found matching your criteria.</Text>
          </View>
        )}
      />

      {/* FILTERS MODAL */}
      <Modal visible={showFiltersModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <X color={theme.text} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={[styles.filterHeading, { color: theme.textSecondary }]}>Status</Text>
              <View style={styles.filterGrid}>
                {['all', 'applied', 'screening_pending', 'screening_selected', 'l1_scheduled', 'l1_select', 'l2_scheduled', 'l2_select', 'col_issued', 'fol_issued', 'joined'].map((stage) => {
                  const isSelected = stageFilter === stage;
                  return (
                    <TouchableOpacity
                      key={stage}
                      style={[
                        styles.filterPill,
                        { 
                          backgroundColor: isSelected ? theme.primary : theme.background,
                          borderColor: isSelected ? theme.primary : theme.border
                        }
                      ]}
                      onPress={() => setStageFilter(stage)}
                    >
                      <Text style={[styles.filterPillText, { color: isSelected ? '#ffffff' : theme.text }]}>
                        {mapStatusLabel(stage)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.filterHeading, { color: theme.textSecondary }]}>Created By</Text>
              <View style={styles.filterGrid}>
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: ownerFilter === 'all' ? theme.primary : theme.background,
                      borderColor: ownerFilter === 'all' ? theme.primary : theme.border
                    }
                  ]}
                  onPress={() => setOwnerFilter('all')}
                >
                  <Text style={[styles.filterPillText, { color: ownerFilter === 'all' ? '#ffffff' : theme.text }]}>All HR</Text>
                </TouchableOpacity>
                {owners.map((owner) => {
                  const isSelected = ownerFilter === owner;
                  return (
                    <TouchableOpacity
                      key={owner}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.background,
                          borderColor: isSelected ? theme.primary : theme.border
                        }
                      ]}
                      onPress={() => setOwnerFilter(owner)}
                    >
                      <Text style={[styles.filterPillText, { color: isSelected ? '#ffffff' : theme.text }]}>
                        {owner}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button
                label="Apply Filters"
                onPress={() => setShowFiltersModal(false)}
                style={{ marginTop: SIZES.lg }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ADD CANDIDATE MODAL */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add New Candidate</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color={theme.text} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer}>
              <View style={styles.formGrid}>
                <View style={styles.formItem}>
                  <Text style={[styles.formLabel, { color: theme.textSecondary }]}>First Name *</Text>
                  <TextInput
                    style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Enter First Name"
                    placeholderTextColor={theme.placeholder}
                    value={formData.first_name}
                    onChangeText={(val) => setFormData({...formData, first_name: val})}
                  />
                </View>

                <View style={styles.formItem}>
                  <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Last Name</Text>
                  <TextInput
                    style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Enter Last Name"
                    placeholderTextColor={theme.placeholder}
                    value={formData.last_name}
                    onChangeText={(val) => setFormData({...formData, last_name: val})}
                  />
                </View>
              </View>

              <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Email Address *</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="email@example.com"
                placeholderTextColor={theme.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email_id}
                onChangeText={(val) => setFormData({...formData, email_id: val})}
              />

              <View style={styles.formGrid}>
                <View style={styles.formItem}>
                  <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Phone Number *</Text>
                  <TextInput
                    style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="10-digit mobile"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="phone-pad"
                    value={formData.phone_number}
                    onChangeText={(val) => setFormData({...formData, phone_number: val})}
                  />
                </View>
                <View style={styles.formItem}>
                  <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Alt. Mobile</Text>
                  <TextInput
                    style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Alternate number"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="phone-pad"
                    value={formData.alternate_mobile_number}
                    onChangeText={(val) => setFormData({...formData, alternate_mobile_number: val})}
                  />
                </View>
              </View>

              <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Skills</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="React, Node.js, etc."
                placeholderTextColor={theme.placeholder}
                value={formData.skills}
                onChangeText={(val) => setFormData({...formData, skills: val})}
              />

              <View style={styles.formGrid}>
                <View style={styles.formItem}>
                  <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Experience</Text>
                  <TextInput
                    style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="e.g. 5 years"
                    placeholderTextColor={theme.placeholder}
                    value={formData.custom_overall_experience_years}
                    onChangeText={(val) => setFormData({...formData, custom_overall_experience_years: val})}
                  />
                </View>
                <View style={styles.formItem}>
                  <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Education</Text>
                  <TextInput
                    style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="e.g. B.Tech"
                    placeholderTextColor={theme.placeholder}
                    value={formData.education}
                    onChangeText={(val) => setFormData({...formData, education: val})}
                  />
                </View>
              </View>

              <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Target Position *</Text>
              <TextInput
                style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="Software Engineer"
                placeholderTextColor={theme.placeholder}
                value={formData.position}
                onChangeText={(val) => setFormData({...formData, position: val})}
              />

              <Button
                label="Save Candidate"
                onPress={handleAddCandidate}
                loading={formLoading}
                style={styles.submitBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: SIZES.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: SIZES.sm,
    fontSize: 14,
    fontFamily: 'Times New Roman',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.sm,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.sm,
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  sortBtn: {
    paddingHorizontal: SIZES.md,
  },
  sortText: {
    ...TYPOGRAPHY.captionBold,
    fontFamily: 'Times New Roman',
  },
  listContent: {
    padding: SIZES.md,
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  itemName: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  itemRole: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
    fontFamily: 'Times New Roman',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  cardInfo: {
    marginTop: SIZES.xs,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Times New Roman',
    marginBottom: 2,
  },
  divider: {
    height: 1,
    marginVertical: SIZES.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    marginLeft: SIZES.sm,
    fontFamily: 'Times New Roman',
  },
  emptyCenter: {
    paddingVertical: SIZES.xxl,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: SIZES.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    fontFamily: 'Times New Roman',
  },
  filterHeading: {
    ...TYPOGRAPHY.captionBold,
    marginBottom: SIZES.sm,
    fontSize: 14,
    fontFamily: 'Times New Roman',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SIZES.lg,
  },
  filterPill: {
    paddingHorizontal: SIZES.md,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    margin: SIZES.xs,
  },
  filterPillText: {
    ...TYPOGRAPHY.captionBold,
    fontFamily: 'Times New Roman',
  },
  formContainer: {
    paddingBottom: SIZES.xxl,
  },
  formGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formItem: {
    flex: 0.48,
  },
  formLabel: {
    ...TYPOGRAPHY.captionBold,
    marginBottom: SIZES.xs,
    fontFamily: 'Times New Roman',
  },
  formInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: SIZES.md,
    fontSize: 14,
    marginBottom: SIZES.md,
    fontFamily: 'Times New Roman',
  },
  submitBtn: {
    marginTop: SIZES.md,
  },
});
export default CandidatesListScreen;
