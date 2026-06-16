import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar, ScrollView, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import { candidatesAPI } from '../services/apiService';
import { Search, ChevronLeft, X, Filter, ChevronRight } from 'lucide-react-native';
import Button from '../components/Button';

export const JobDetailScreen = ({ route, navigation }: any) => {
  const { theme } = useTheme();
  const { position } = route.params;
  const decodedPosition = decodeURIComponent(position);

  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await candidatesAPI.getAll();
      const decoded = decodedPosition.toLowerCase().trim();

      const filtered = res.data.filter((c: any) => {
        const pos = (c.position || '').toString().toLowerCase().trim();
        const client = (c.client_name || '').toString().toLowerCase().trim();
        const combined = (pos && client) ? `${pos} - ${client}` : pos || client;

        if (!combined) return false;
        if (combined === decoded) return true;
        if (pos === decoded || client === decoded) return true;

        const parts = decoded.split(' - ').map(s => s.trim()).filter(Boolean);
        if (parts.length === 2) {
          const [titlePart, clientPart] = parts;
          if (pos.includes(titlePart) && client.includes(clientPart)) return true;
        }

        if (combined.includes(decoded) || decoded.includes(combined)) return true;
        return false;
      });

      setCandidates(filtered);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
      // Mock fallback
      setCandidates(getMockCandidatesForPosition(decodedPosition));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [position]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        c.email_id?.toLowerCase().includes(q) ||
        c.phone_number?.includes(q);

      const matchesStatus = !statusFilter || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [candidates, searchTerm, statusFilter]);

  const renderCandidateItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.candidateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => navigation.navigate('CandidateDetail', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.first_name || 'C')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]}>{item.first_name} {item.last_name}</Text>
          <Text style={[styles.idText, { color: theme.textSecondary }]}>ID: #{item.id}</Text>
        </View>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={[styles.statusText, { color: getStatusStyle(item.status).color }]}>{item.status || 'applied'}</Text>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>📧 {item.email_id || '-'}</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>📱 {item.phone_number || '-'}</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <View style={styles.cardFooter}>
        <Text style={[styles.updatedBy, { color: theme.textSecondary }]}>Updated by: {item.updated_by_name || 'Unknown'}</Text>
        <ChevronRight size={18} color={theme.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>{decodedPosition}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{filteredCandidates.length} candidate(s) found</Text>
        </View>
      </View>

      {/* Search & Filter Row */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Search size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search candidates..."
            placeholderTextColor={theme.placeholder}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <X size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, { borderColor: theme.border, backgroundColor: statusFilter ? theme.primary : theme.surface }]}
          onPress={() => setShowStatusModal(true)}
        >
          <Filter size={18} color={statusFilter ? '#fff' : theme.primary} />
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading candidates...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCandidates}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCandidateItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={{ color: theme.textSecondary, fontFamily: 'Times New Roman' }}>No candidates found for this position.</Text>
            </View>
          )}
        />
      )}

      {/* Status Filter Modal */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filter by Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <X size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity
                style={[styles.filterOption, !statusFilter && { backgroundColor: theme.background }]}
                onPress={() => { setStatusFilter(''); setShowStatusModal(false); }}
              >
                <Text style={[styles.filterOptionText, { color: !statusFilter ? theme.primary : theme.text }]}>All Status</Text>
              </TouchableOpacity>
              {['applied', 'screening_pending', 'l1_scheduled', 'l1_select', 'l1_reject', 'l2_scheduled', 'l2_select', 'l2_reject', 'col_issued', 'joined'].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterOption, statusFilter === s && { backgroundColor: theme.background }]}
                  onPress={() => { setStatusFilter(s); setShowStatusModal(false); }}
                >
                  <Text style={[styles.filterOptionText, { color: statusFilter === s ? theme.primary : theme.text }]}>
                    {s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStatusStyle = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'applied': return { backgroundColor: '#E5E7EB', color: '#374151' };
    case 'l1_select':
    case 'l2_select':
    case 'screening_selected': return { backgroundColor: '#D1FAE5', color: '#065F46' };
    case 'l1_scheduled':
    case 'l2_scheduled': return { backgroundColor: '#FEF3C7', color: '#92400E' };
    case 'col_issued':
    case 'fol_issued': return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
    case 'joined': return { backgroundColor: '#ECFDF5', color: '#047857' };
    case 'rejected':
    case 'l1_reject':
    case 'l2_reject': return { backgroundColor: '#FEE2E2', color: '#991B1B' };
    default: return { backgroundColor: '#F3F4F6', color: '#6B7280' };
  }
};

function getMockCandidatesForPosition(pos: string) {
  return [
    { id: '101', first_name: 'Amit', last_name: 'Sharma', email_id: 'amit@gmail.com', phone_number: '9988776655', status: 'l1_scheduled', updated_by_name: 'Rahul' },
    { id: '102', first_name: 'Neha', last_name: 'Patel', email_id: 'neha@gmail.com', phone_number: '8877665544', status: 'applied', updated_by_name: 'Keerthana' },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 16,
    alignItems: 'flex-start',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
    marginRight: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Times New Roman',
    marginTop: 4,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Times New Roman',
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Times New Roman',
  },
  listContent: {
    padding: 24,
    paddingTop: 0,
  },
  candidateCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  idText: {
    fontSize: 12,
    fontFamily: 'Times New Roman',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    textTransform: 'uppercase',
  },
  cardInfo: {
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Times New Roman',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updatedBy: {
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: 'Times New Roman',
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  filterOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterOptionText: {
    fontSize: 15,
    fontFamily: 'Times New Roman',
  },
});

export default JobDetailScreen;
