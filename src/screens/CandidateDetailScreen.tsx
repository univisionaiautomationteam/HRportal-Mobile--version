import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import { candidatesAPI, jobsAPI } from '../services/apiService';
import { formatDate, formatDateTime } from '../utils';
import Button from '../components/Button';
import Card from '../components/Card';
import {
  User,
  Mail,
  Phone,
  Shield,
  FileText,
  Plus,
  MessageSquare,
  ChevronLeft,
  Edit2,
  Check,
  X,
  History,
  Briefcase
} from 'lucide-react-native';

export const CandidateDetailScreen = ({ route, navigation }: any) => {
  const { theme } = useTheme();
  const { id } = route.params;

  const [candidate, setCandidate] = useState<any>(null);
  const [remarks, setRemarks] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [updateNote, setUpdateNote] = useState('');

  const [showRemarkForm, setShowRemarkForm] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [candRes, remRes, jobsRes] = await Promise.all([
        candidatesAPI.getById(id),
        candidatesAPI.getRemarks(id),
        jobsAPI.getAll()
      ]);
      
      setCandidate(candRes.data);
      setFormData(candRes.data);
      setRemarks(remRes.data || []);
      setJobs(jobsRes.data || []);
    } catch (err) {
      console.error('Failed to load candidate details:', err);
      // Mock fallback
      const mock = getMockDetails(id);
      setCandidate(mock.candidate);
      setFormData(mock.candidate);
      setRemarks(mock.remarks);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      // Logic from web: detect changes for the timeline remark
      const TRACKED_FIELDS: any = {
        first_name: 'First Name', last_name: 'Last Name', email_id: 'Email', phone_number: 'Phone',
        position: 'Position', status: 'Status', skills: 'Skills', education: 'Education'
      };

      const changes: any[] = [];
      Object.keys(TRACKED_FIELDS).forEach(key => {
        const oldVal = String(candidate[key] ?? '').trim();
        const newVal = String(formData[key] ?? '').trim();
        if (oldVal !== newVal) {
          changes.push({ field: TRACKED_FIELDS[key], from: oldVal || '—', to: newVal || '—' });
        }
      });

      const remarkType = changes.some(c => c.field === 'Status') ? 'status_change' : 'profile_update';

      await candidatesAPI.update(id, { ...formData, note: updateNote });

      if (changes.length > 0 || updateNote) {
        await candidatesAPI.addRemark(id, {
          remark_type: remarkType,
          title: 'Profile Updated',
          description: updateNote || null,
          changed_fields: changes
        });
      }

      Alert.alert('Success', 'Profile updated successfully.');
      setEditMode(false);
      setUpdateNote('');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostRemark = async () => {
    if (!newRemark.trim()) return;
    setSubmitting(true);
    try {
      await candidatesAPI.addRemark(id, {
        remark_type: 'custom',
        title: 'HR Note',
        description: newRemark
      });
      setNewRemark('');
      setShowRemarkForm(false);
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to post remark.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !candidate) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'joined': return '#059669';
      case 'col_issued': return '#7C3AED';
      case 'rejected': return '#DC2626';
      case 'l1_scheduled': return '#EA580C';
      default: return '#1E40AF';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            {!editMode ? (
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: theme.primary }]} onPress={() => setEditMode(true)}>
                <Edit2 size={16} color="#fff" />
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.row}>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.success }]} onPress={handleSave} disabled={submitting}>
                  <Check size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.danger }]} onPress={() => { setEditMode(false); setFormData(candidate); }}>
                  <X size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Identity Card */}
          <View style={[styles.profileCard, { backgroundColor: '#1E40AF' }]}>
            <View style={styles.profileInfo}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{(candidate.first_name || 'C')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                {editMode ? (
                  <View style={styles.nameInputs}>
                    <TextInput
                      style={styles.nameInput}
                      value={formData.first_name}
                      onChangeText={v => setFormData({...formData, first_name: v})}
                      placeholder="First Name"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                    />
                    <TextInput
                      style={styles.nameInput}
                      value={formData.last_name}
                      onChangeText={v => setFormData({...formData, last_name: v})}
                      placeholder="Last Name"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                    />
                  </View>
                ) : (
                  <Text style={styles.profileName}>{candidate.first_name} {candidate.last_name}</Text>
                )}
                <Text style={styles.profileId}>Candidate ID: #{candidate.id}</Text>
              </View>
            </View>
          </View>

          {/* Metadata Bar */}
          <View style={[styles.metaBar, { backgroundColor: '#F8FAFC', borderBottomColor: theme.border }]}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>MANAGED BY</Text>
              <Text style={styles.metaValue}>{candidate.created_by_name || 'Unassigned'}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>UPLOADED ON</Text>
              <Text style={styles.metaValue}>{formatDate(candidate.created_at)}</Text>
            </View>
          </View>

          {/* Form Fields Sections */}
          <Card title="Contact Information">
            <EditableField label="Email Address" value={formData.email_id} name="email_id" editMode={editMode} onChange={(v: any) => setFormData({...formData, email_id: v})} />
            <EditableField label="Phone Number" value={formData.phone_number} name="phone_number" editMode={editMode} onChange={(v: any) => setFormData({...formData, phone_number: v})} />
            <EditableField label="Alternate Phone" value={formData.alternate_mobile_number} name="alternate_mobile_number" editMode={editMode} onChange={(v: any) => setFormData({...formData, alternate_mobile_number: v})} />
          </Card>

          <Card title="Professional Details">
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>TARGET POSITION</Text>
              {editMode ? (
                <View style={[styles.pickerContainer, { borderColor: theme.border }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {jobs.map(job => {
                      const val = `${job.title} - ${job.client_name}`;
                      const isSelected = formData.position === val;
                      return (
                        <TouchableOpacity key={job.id} style={[styles.pickerPill, isSelected && { backgroundColor: theme.primary }]} onPress={() => setFormData({...formData, position: val})}>
                          <Text style={[styles.pickerPillText, isSelected && { color: '#fff' }]}>{val}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : (
                <Text style={[styles.fieldValue, { color: theme.text }]}>{candidate.position || '—'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CURRENT STATUS</Text>
              {editMode ? (
                <View style={styles.statusGrid}>
                  {['applied', 'screening_pending', 'l1_scheduled', 'l1_select', 'l1_reject', 'col_issued', 'joined'].map(s => {
                    const isSelected = formData.status === s;
                    return (
                      <TouchableOpacity key={s} style={[styles.statusBtn, isSelected && { backgroundColor: getStatusColor(s), borderColor: getStatusColor(s) }]} onPress={() => setFormData({...formData, status: s})}>
                        <Text style={[styles.statusBtnText, isSelected && { color: '#fff' }]}>{s.replace(/_/g, ' ')}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(candidate.status) + '15', borderColor: getStatusColor(candidate.status) }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(candidate.status) }]}>{candidate.status}</Text>
                </View>
              )}
            </View>

            <EditableField label="Current Employer" value={formData.custom_current_employer} editMode={editMode} onChange={(v: any) => setFormData({...formData, custom_current_employer: v})} />
            <EditableField label="Total Experience" value={formData.custom_overall_experience_years} editMode={editMode} onChange={(v: any) => setFormData({...formData, custom_overall_experience_years: v})} />
            <EditableField label="Notice Period" value={formData.notice_period} editMode={editMode} onChange={(v: any) => setFormData({...formData, notice_period: v})} />
          </Card>

          <Card title="Compensation (LPA)">
            <View style={styles.row}>
              <EditableField style={{ flex: 1 }} label="Current Salary" value={formData.custom_current_salary_lpa} editMode={editMode} onChange={(v: any) => setFormData({...formData, custom_current_salary_lpa: v})} />
              <View style={{ width: 12 }} />
              <EditableField style={{ flex: 1 }} label="Expected Salary" value={formData.custom_expected_salary_lpa} editMode={editMode} onChange={(v: any) => setFormData({...formData, custom_expected_salary_lpa: v})} />
            </View>
          </Card>

          <Card title="Skills & Education">
            <EditableField label="Skills Set" value={formData.skills} textarea editMode={editMode} onChange={(v: any) => setFormData({...formData, skills: v})} />
            <EditableField label="Academic Background" value={formData.education} textarea editMode={editMode} onChange={(v: any) => setFormData({...formData, education: v})} />
          </Card>

          {editMode && (
            <Card title="Update Log Note" style={{ backgroundColor: '#FFFBEB' }}>
              <TextInput
                style={styles.updateNoteInput}
                placeholder="Briefly state reason for this profile update..."
                multiline
                numberOfLines={3}
                value={updateNote}
                onChangeText={setUpdateNote}
              />
            </Card>
          )}

          {/* Timeline Section */}
          <View style={styles.timelineSection}>
            <View style={styles.timelineHeader}>
              <History size={20} color={theme.text} />
              <Text style={[styles.timelineTitle, { color: theme.text }]}>Interaction Timeline</Text>
              <TouchableOpacity style={[styles.addRemarkBtn, { backgroundColor: theme.primary }]} onPress={() => setShowRemarkForm(true)}>
                <Plus size={14} color="#fff" />
              </TouchableOpacity>
            </View>

            {showRemarkForm && (
              <View style={styles.remarkForm}>
                <TextInput
                  style={[styles.remarkInput, { borderColor: theme.border }]}
                  placeholder="Type a new remark or feedback note..."
                  multiline
                  value={newRemark}
                  onChangeText={setNewRemark}
                />
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.saveRemarkBtn, { backgroundColor: theme.success }]} onPress={handlePostRemark}>
                    <Text style={styles.saveRemarkText}>Save Remark</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelRemarkBtn} onPress={() => { setShowRemarkForm(false); setNewRemark(''); }}>
                    <Text style={[styles.cancelRemarkText, { color: theme.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {remarks.length === 0 ? (
              <Text style={styles.emptyText}>No activity logs yet.</Text>
            ) : (
              <View style={styles.remarksList}>
                {remarks.map((r, i) => (
                  <View key={r.id} style={styles.remarkItem}>
                    <View style={styles.remarkLine}>
                      <View style={[styles.remarkDot, { backgroundColor: '#1E40AF' }]} />
                      {i < remarks.length - 1 && <View style={styles.remarkConnector} />}
                    </View>
                    <View style={[styles.remarkContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <View style={styles.remarkTop}>
                        <Text style={[styles.remarkTitle, { color: theme.text }]}>{r.title || 'HR Update'}</Text>
                        <Text style={styles.remarkDate}>{formatDateTime(r.created_at)}</Text>
                      </View>
                      {r.description && <Text style={[styles.remarkDesc, { color: theme.textSecondary }]}>&ldquo;{r.description}&rdquo;</Text>}
                      {r.changed_fields && (
                        <View style={styles.diffBox}>
                          {JSON.parse(typeof r.changed_fields === 'string' ? r.changed_fields : JSON.stringify(r.changed_fields)).map((f: any, idx: number) => (
                            <Text key={idx} style={styles.diffText}>
                              <Text style={{ fontWeight: '600' }}>{f.field}:</Text> {f.from} → {f.to}
                            </Text>
                          ))}
                        </View>
                      )}
                      <Text style={styles.remarkAuthor}>By: {r.updated_by_name || 'System'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const EditableField = ({ label, value, editMode, onChange, textarea, style }: any) => (
  <View style={[styles.field, style]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {editMode ? (
      <TextInput
        style={[styles.input, textarea && { height: 80, textAlignVertical: 'top' }]}
        value={String(value || '')}
        onChangeText={onChange}
        multiline={textarea}
      />
    ) : (
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    )}
  </View>
);

function getMockDetails(id: string) {
  return {
    candidate: { id, first_name: 'Amit', last_name: 'Sharma', email_id: 'amit@gmail.com', phone_number: '9988776655', position: 'Node.js Developer', status: 'l1_scheduled', created_at: new Date().toISOString() },
    remarks: [{ id: 'r1', title: 'Status Update', description: 'Screening cleared.', created_at: new Date().toISOString(), updated_by_name: 'Rahul' }]
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    padding: 32,
    paddingBottom: 40,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarLargeText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  profileName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  profileId: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
    fontFamily: 'Times New Roman',
  },
  nameInputs: {
    gap: 8,
  },
  nameInput: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.5)',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    padding: 4,
  },
  metaBar: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Times New Roman',
  },
  metaDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '100%',
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Times New Roman',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    fontFamily: 'Times New Roman',
    color: '#0F172A',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  pickerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  pickerPillText: {
    fontSize: 12,
    fontFamily: 'Times New Roman',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  updateNoteInput: {
    fontSize: 14,
    fontFamily: 'Times New Roman',
    textAlignVertical: 'top',
  },
  timelineSection: {
    padding: 24,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    marginLeft: 10,
    flex: 1,
  },
  addRemarkBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remarkForm: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 24,
  },
  remarkInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Times New Roman',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  saveRemarkBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 12,
  },
  saveRemarkText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelRemarkBtn: {
    padding: 10,
  },
  cancelRemarkText: {
    fontWeight: '600',
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    paddingVertical: 20,
    fontFamily: 'Times New Roman',
  },
  remarksList: {
    paddingLeft: 4,
  },
  remarkItem: {
    flexDirection: 'row',
    gap: 16,
  },
  remarkLine: {
    alignItems: 'center',
    width: 16,
  },
  remarkDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    zIndex: 2,
    elevation: 2,
  },
  remarkConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: -2,
  },
  remarkContent: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  remarkTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  remarkTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    flex: 1,
  },
  remarkDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  remarkDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  diffBox: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    gap: 4,
    marginBottom: 8,
  },
  diffText: {
    fontSize: 12,
    color: '#475569',
  },
  remarkAuthor: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'right',
  }
});

export default CandidateDetailScreen;
