import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Activity,
  Calendar,
  Clock,
  Copy,
  Cpu,
  Filter,
  Info,
  Link as LinkIcon,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { interviewsAPI, candidatesAPI, interviewersAPI, jobsAPI, aiAPI } from '../services/apiService';
import { formatDateTime } from '../utils';
import Button from '../components/Button';
import Card from '../components/Card';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const isValidPersonName = (value: string) => {
  const name = String(value || '').trim();
  if (!name) return false;
  return /^(?=.*[A-Za-z])[A-Za-z][A-Za-z\s.'-]*$/.test(name);
};

const normalizeText = (value: string) => String(value || '').trim();

export const InterviewsListScreen = ({ navigation }: any) => {
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [candidates, setCandidates] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  const [candidateSearch, setCandidateSearch] = useState('');
  const [interviewSearch, setInterviewSearch] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState('All');
  const [showJobFilterModal, setShowJobFilterModal] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showManageInterviewersModal, setShowManageInterviewersModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [interviewMode, setInterviewMode] = useState<'manual' | 'ai'>('manual');

  const [form, setForm] = useState({
    scheduled_date: '',
    interview_type: 'Technical',
    interviewer_department: '',
    resume_text: '',
    job_description: '',
    selectedInterviewers: [] as any[],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [candidatePage, setCandidatePage] = useState(1);
  const [interviewPage, setInterviewPage] = useState(1);

  const [newInterviewer, setNewInterviewer] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
  });

  const positionOptions = useMemo(() => {
    const list = jobs
      .map((job: any) => `${job.title || ''}${job.client_name ? ` - ${job.client_name}` : ''}`.trim())
      .filter(Boolean);
    return ['All', ...Array.from(new Set(list))];
  }, [jobs]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [candRes, intRes, interRes, jobsRes] = await Promise.allSettled([
        candidatesAPI.getAll(),
        interviewsAPI.getAll(),
        interviewersAPI.getAll(),
        jobsAPI.getAll(),
      ]);

      if (candRes.status === 'fulfilled') setCandidates(candRes.value.data || []);
      if (intRes.status === 'fulfilled') setInterviews(intRes.value.data || []);
      if (interRes.status === 'fulfilled') setInterviewers(interRes.value.data || []);
      if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value.data || []);
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCandidatePage(1);
  }, [candidateSearch, selectedJobFilter]);

  useEffect(() => {
    setInterviewPage(1);
  }, [interviewSearch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredCandidates = useMemo(() => {
    let list = [...candidates];
    if (selectedJobFilter !== 'All') {
      list = list.filter((candidate) => (candidate.position || '').toLowerCase().includes(selectedJobFilter.toLowerCase()));
    }
    if (candidateSearch.trim()) {
      const query = candidateSearch.toLowerCase();
      list = list.filter((candidate) => {
        const fullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.toLowerCase();
        const position = (candidate.position || '').toLowerCase();
        const status = (candidate.status || '').toLowerCase();
        return fullName.includes(query) || position.includes(query) || status.includes(query);
      });
    }
    return list;
  }, [candidates, candidateSearch, selectedJobFilter]);

  const filteredInterviews = useMemo(() => {
    if (!interviewSearch.trim()) return interviews;
    const query = interviewSearch.toLowerCase();
    return interviews.filter((interview) => {
      const fields = [
        interview.candidate_name,
        interview.candidate_email,
        interview.interviewer_name,
        interview.interview_type,
        interview.status,
        interview.meeting_link,
      ];
      return fields.some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [interviews, interviewSearch]);

  const candidatesPerPage = 10;
  const interviewsPerPage = 8;
  const totalCandidatePages = Math.max(1, Math.ceil(filteredCandidates.length / candidatesPerPage));
  const totalInterviewPages = Math.max(1, Math.ceil(filteredInterviews.length / interviewsPerPage));
  const paginatedCandidates = filteredCandidates.slice(
    (candidatePage - 1) * candidatesPerPage,
    candidatePage * candidatesPerPage,
  );
  const paginatedInterviews = filteredInterviews.slice(
    (interviewPage - 1) * interviewsPerPage,
    interviewPage * interviewsPerPage,
  );

  const openScheduleModal = (candidate: any) => {
    setSelectedCandidate(candidate);
    setInterviewMode('manual');
    setGeneratedLink('');
    setForm({
      scheduled_date: '',
      interview_type: 'Technical',
      interviewer_department: candidate.position || '',
      resume_text: '',
      job_description: '',
      selectedInterviewers: [],
    });
    setShowScheduleModal(true);
  };

  const handleScheduleManual = async () => {
    const { scheduled_date, interview_type, interviewer_department, selectedInterviewers } = form;
    const normalizedDate = normalizeText(scheduled_date);

    if (!normalizedDate || !interviewer_department || !selectedInterviewers.length) {
      Alert.alert('Missing Info', 'Please fill the date/time, department and select at least one interviewer.');
      return;
    }

    const invalidInterviewer = selectedInterviewers.find((id) => {
      const interviewer = interviewers.find((item) => item.id === id);
      const name = normalizeText(interviewer?.name || '');
      const email = normalizeText(interviewer?.email || '');
      return !isValidPersonName(name) || (email && !isValidEmail(email));
    });

    if (invalidInterviewer) {
      Alert.alert('Validation Error', 'Please select valid interviewer details before scheduling.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        candidate_id: selectedCandidate.id,
        scheduled_date: normalizedDate,
        interview_type,
        interviewer_department,
        resume_text: form.resume_text || undefined,
        job_description: form.job_description || undefined,
        interviewers: selectedInterviewers.map((id) => {
          const found = interviewers.find((item) => item.id === id);
          return {
            interviewer_name: found?.name || '',
            interviewer_email: found?.email || '',
            interviewer_role: found?.role || '',
            interviewer_department: found?.department || '',
          };
        }),
      };

      await interviewsAPI.create(payload);
      Alert.alert('Success', 'Interview scheduled and invitation sent.');
      setShowScheduleModal(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to schedule interview.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleGenerateAILink = async () => {
    if (!selectedCandidate?.email_id) {
      Alert.alert('Error', 'Candidate email is required to generate the AI interview link.');
      return;
    }

    setFormLoading(true);
    try {
      const response = await aiAPI.getInterviewTips({
        candidate_id: selectedCandidate.id,
        candidate_name: `${selectedCandidate.first_name || ''} ${selectedCandidate.last_name || ''}`.trim(),
        candidate_email: selectedCandidate.email_id,
        interview_type: 'AI HR Interview',
        resume_text: form.resume_text || undefined,
        job_description: form.job_description || undefined,
      });

      const interviewLink = response?.data?.interview_link || response?.data?.link || `https://hr-portal-v2.univision.com/interview/${selectedCandidate.id}?type=ai`;
      setGeneratedLink(interviewLink);
      Clipboard.setString(interviewLink);
      Alert.alert('Link Generated', 'AI interview link generated and copied.');
    } catch (err) {
      const fallbackLink = `https://hr-portal-v2.univision.com/interview/${selectedCandidate.id}?type=ai`;
      setGeneratedLink(fallbackLink);
      Alert.alert('Link Prepared', 'The AI interview link was prepared locally.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelInterview = (id: string, name: string) => {
    Alert.alert('Cancel Interview', `Cancel ${name || 'this interview'}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await interviewsAPI.cancel(id);
            await loadData();
          } catch (err) {
            Alert.alert('Error', 'Failed to cancel interview.');
          }
        },
      },
    ]);
  };

  const addInterviewer = async () => {
    const { name, email, role, department } = newInterviewer;
    const normalizedName = normalizeText(name);
    const normalizedEmail = normalizeText(email).toLowerCase();
    const normalizedRole = normalizeText(role);
    const normalizedDepartment = normalizeText(department);

    if (!normalizedName || !normalizedRole || !normalizedDepartment) {
      Alert.alert('Missing Fields', 'Please fill the interviewer name, role, and department.');
      return;
    }

    if (!isValidPersonName(normalizedName)) {
      Alert.alert('Validation Error', 'Please enter a valid interviewer name.');
      return;
    }

    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid interviewer email address.');
      return;
    }

    try {
      await interviewersAPI.create({
        name: normalizedName,
        email: normalizedEmail,
        role: normalizedRole,
        department: normalizedDepartment,
      });
      setNewInterviewer({ name: '', email: '', role: '', department: '' });
      await loadData();
      Alert.alert('Success', 'Interviewer added.');
    } catch (err) {
      Alert.alert('Error', 'Failed to add interviewer.');
    }
  };

  const deleteInterviewer = async (id: string) => {
    try {
      await interviewersAPI.delete(id);
      await loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to remove interviewer.');
    }
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Interview link copied to clipboard.');
  };

  const renderCandidateItem = ({ item }: { item: any }) => (
    <View style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.first_name || 'C')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.itemName, { color: theme.text }]}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={[styles.itemSub, { color: theme.textSecondary }]}>{item.position || 'No Position'}</Text>
          <Text style={[styles.itemSub, { color: theme.textSecondary }]}>Status: {item.status || 'Pending'}</Text>
        </View>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: theme.primary }]} onPress={() => openScheduleModal(item)}>
          <Text style={styles.smallBtnText}>Schedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInterviewItem = ({ item }: { item: any }) => {
    const isCancelled = String(item.status || '').toLowerCase() === 'cancelled';
    return (
      <View style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: '#0F172A' }]}>
            <Text style={styles.avatarText}>{(item.candidate_name || 'I')[0].toUpperCase()}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.itemName, { color: theme.text }]}>{item.candidate_name || 'Unknown Candidate'}</Text>
            <Text style={[styles.itemSub, { color: theme.textSecondary }]}>{item.candidate_email || 'No email'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isCancelled ? '#FEE2E2' : '#EFF6FF' }]}>
            <Text style={[styles.statusBadgeText, { color: isCancelled ? '#B91C1C' : '#1D4ED8' }]}>
              {String(item.status || 'scheduled').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.metaRow}>
          <Info size={14} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.text }]}>Type: {item.interview_type || 'Interview'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Users size={14} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.text }]}>Panel: {item.interviewer_name || 'TBD'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Clock size={14} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.text }]}>{formatDateTime(item.scheduled_date)}</Text>
        </View>

        {item.meeting_link ? (
          <TouchableOpacity style={styles.linkRow} onPress={() => copyToClipboard(item.meeting_link)}>
            <LinkIcon size={14} color={theme.primary} />
            <Text style={[styles.linkText, { color: theme.primary }]} numberOfLines={1}>
              {item.meeting_link}
            </Text>
            <Copy size={12} color={theme.primary} />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.itemSub, { color: theme.textSecondary, marginTop: 8 }]}>No meeting link yet</Text>
        )}

        {!isCancelled && (
          <TouchableOpacity style={[styles.cancelLink, { marginTop: 12 }]} onPress={() => handleCancelInterview(item.id, item.candidate_name)}>
            <Trash2 size={14} color={theme.danger} />
            <Text style={[styles.cancelLinkText, { color: theme.danger }]}>Cancel Interview</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && !candidates.length && !interviews.length) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
        <StatusBar barStyle="dark-content" />
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading interviews…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <StatusBar barStyle="dark-content" />

      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}> 
        <TouchableOpacity style={[styles.tab, activeTab === 'schedule' && { borderBottomColor: '#0F172A' }]} onPress={() => setActiveTab('schedule')}>
          <Text style={[styles.tabText, activeTab === 'schedule' && { color: '#0F172A' }]}>Schedule Interview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#0F172A' }]} onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && { color: '#0F172A' }]}>Interview List</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'schedule' ? (
          <>
            <View style={styles.headerSection}>
              <View style={styles.headerTextWrap}>
                <Text style={[styles.pageTitle, { color: theme.text }]}>Schedule Interview</Text>
                <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>Manage candidate interview scheduling.</Text>
              </View>
              <TouchableOpacity style={[styles.manageBtn, { backgroundColor: '#0F172A' }]} onPress={() => setShowManageInterviewersModal(true)}>
                <Users size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
                <Search size={18} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search by name, position or status"
                  value={candidateSearch}
                  onChangeText={setCandidateSearch}
                />
              </View>
              <TouchableOpacity style={[styles.filterBtn, { borderColor: theme.border }]} onPress={() => setShowJobFilterModal(true)}>
                <Filter size={16} color={theme.text} />
                <Text style={[styles.filterBtnText, { color: theme.text }]}> {selectedJobFilter}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.manageBtn, { backgroundColor: '#0F172A' }]} onPress={() => navigation.navigate('InterviewMonitoring')}>
                <Activity size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.resultsText, { color: theme.textSecondary }]}>Showing {filteredCandidates.length} candidate(s)</Text>

            <FlatList
              data={paginatedCandidates}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderCandidateItem}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No candidates found.</Text>}
            />

            {totalCandidatePages > 1 && (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.paginationBtn, candidatePage === 1 && styles.paginationBtnDisabled]}
                  disabled={candidatePage === 1}
                  onPress={() => setCandidatePage((prev) => Math.max(1, prev - 1))}
                >
                  <Text style={styles.paginationBtnText}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.paginationText, { color: theme.textSecondary }]}>Page {candidatePage} of {totalCandidatePages}</Text>
                <TouchableOpacity
                  style={[styles.paginationBtn, candidatePage === totalCandidatePages && styles.paginationBtnDisabled]}
                  disabled={candidatePage === totalCandidatePages}
                  onPress={() => setCandidatePage((prev) => Math.min(totalCandidatePages, prev + 1))}
                >
                  <Text style={styles.paginationBtnText}>→</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={[styles.headerSection, { marginBottom: 12 }]}> 
              <View style={styles.headerTextWrap}>
                <Text style={[styles.pageTitle, { color: theme.text }]}>Interview List</Text>
                <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>Review scheduled interviews, meeting links, and organizer details.</Text>
              </View>
            </View>

            <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 12 }]}> 
              <Search size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search candidate, interviewer, status..."
                value={interviewSearch}
                onChangeText={setInterviewSearch}
              />
            </View>

            <Text style={[styles.resultsText, { color: theme.textSecondary }]}>Showing {filteredInterviews.length} interview(s)</Text>

            <FlatList
              data={paginatedInterviews}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderInterviewItem}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No scheduled interviews found.</Text>}
            />

            {totalInterviewPages > 1 && (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.paginationBtn, interviewPage === 1 && styles.paginationBtnDisabled]}
                  disabled={interviewPage === 1}
                  onPress={() => setInterviewPage((prev) => Math.max(1, prev - 1))}
                >
                  <Text style={styles.paginationBtnText}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.paginationText, { color: theme.textSecondary }]}>Page {interviewPage} of {totalInterviewPages}</Text>
                <TouchableOpacity
                  style={[styles.paginationBtn, interviewPage === totalInterviewPages && styles.paginationBtnDisabled]}
                  disabled={interviewPage === totalInterviewPages}
                  onPress={() => setInterviewPage((prev) => Math.min(totalInterviewPages, prev + 1))}
                >
                  <Text style={styles.paginationBtnText}>→</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      <Modal visible={showScheduleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}> 
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Interview</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Candidate: {selectedCandidate?.first_name} {selectedCandidate?.last_name}</Text>
                <Text style={styles.infoLabel}>Position: {selectedCandidate?.position}</Text>
              </View>

              <View style={styles.modeBar}>
                <TouchableOpacity style={[styles.modeBtn, interviewMode === 'manual' && styles.modeBtnActive]} onPress={() => setInterviewMode('manual')}>
                  <Text style={[styles.modeBtnText, interviewMode === 'manual' && styles.modeBtnTextActive]}>Manual</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modeBtn, interviewMode === 'ai' && styles.modeBtnActive]} onPress={() => setInterviewMode('ai')}>
                  <Text style={[styles.modeBtnText, interviewMode === 'ai' && styles.modeBtnTextActive]}>AI Interview</Text>
                </TouchableOpacity>
              </View>

              {interviewMode === 'manual' ? (
                <>
                  <Text style={styles.label}>Date & Time</Text>
                  <TextInput
                    style={[styles.input, { borderColor: theme.border }]}
                    value={form.scheduled_date}
                    placeholder="YYYY-MM-DDTHH:MM"
                    onChangeText={(text) => setForm((prev) => ({ ...prev, scheduled_date: text }))}
                  />

                  <Text style={styles.label}>Interview Type</Text>
                  <View style={styles.pickerRow}>
                    {['Technical', 'Non-Technical'].map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[styles.pickerBtn, form.interview_type === item && { backgroundColor: '#1E3A8A' }]}
                        onPress={() => setForm((prev) => ({ ...prev, interview_type: item }))}
                      >
                        <Text style={[styles.pickerBtnText, form.interview_type === item && { color: '#fff' }]}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Department</Text>
                  <View style={styles.chipWrap}>
                    {positionOptions.filter((item) => item !== 'All').map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[styles.chip, form.interviewer_department === item && styles.chipActive]}
                        onPress={() => setForm((prev) => ({ ...prev, interviewer_department: item }))}
                      >
                        <Text style={[styles.chipText, form.interviewer_department === item && styles.chipTextActive]}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Select Interviewers</Text>
                  <View style={styles.chipWrap}>
                    {interviewers.map((interviewer) => {
                      const selected = form.selectedInterviewers.includes(interviewer.id);
                      return (
                        <TouchableOpacity
                          key={interviewer.id}
                          style={[styles.chip, selected && styles.chipActive]}
                          onPress={() => {
                            const next = selected
                              ? form.selectedInterviewers.filter((id) => id !== interviewer.id)
                              : [...form.selectedInterviewers, interviewer.id];
                            setForm((prev) => ({ ...prev, selectedInterviewers: next }));
                          }}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextActive]}>{interviewer.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Button label={formLoading ? 'Scheduling...' : 'Schedule & Send Invitation'} onPress={handleScheduleManual} loading={formLoading} style={{ marginTop: 20 }} />
                </>
              ) : (
                <View style={styles.aiContainer}>
                  <Text style={styles.aiDesc}>Paste the resume text and job description to generate the AI interview link for the selected candidate.</Text>

                  <Text style={styles.label}>Resume Context</Text>
                  <TextInput
                    style={[styles.textArea, { borderColor: theme.border }]}
                    multiline
                    numberOfLines={4}
                    placeholder="Paste resume text or key skills..."
                    value={form.resume_text}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, resume_text: text }))}
                  />

                  <Text style={styles.label}>Job Description</Text>
                  <TextInput
                    style={[styles.textArea, { borderColor: theme.border }]}
                    multiline
                    numberOfLines={4}
                    placeholder="Paste the job description here."
                    value={form.job_description}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, job_description: text }))}
                  />

                  {generatedLink ? (
                    <View style={styles.linkCard}>
                      <Text style={styles.linkLabel}>Generated Interview Link</Text>
                      <TouchableOpacity onPress={() => copyToClipboard(generatedLink)}>
                        <Text style={styles.linkUrl}>{generatedLink}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <Button label={formLoading ? 'Generating...' : 'Generate Interview Link'} onPress={handleGenerateAILink} loading={formLoading} style={{ marginTop: 20 }} />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showManageInterviewersModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, height: '85%' }]}> 
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Interviewers</Text>
              <TouchableOpacity onPress={() => setShowManageInterviewersModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Card title="Add New Interviewer">
                <TextInput
                  style={[styles.input, { borderColor: theme.border }]}
                  placeholder="Full Name"
                  value={newInterviewer.name}
                  onChangeText={(text) => setNewInterviewer((prev) => ({ ...prev, name: text }))}
                />
                <TextInput
                  style={[styles.input, { borderColor: theme.border }]}
                  placeholder="Email"
                  value={newInterviewer.email}
                  onChangeText={(text) => setNewInterviewer((prev) => ({ ...prev, email: text }))}
                />
                <TextInput
                  style={[styles.input, { borderColor: theme.border }]}
                  placeholder="Role"
                  value={newInterviewer.role}
                  onChangeText={(text) => setNewInterviewer((prev) => ({ ...prev, role: text }))}
                />
                <TextInput
                  style={[styles.input, { borderColor: theme.border }]}
                  placeholder="Department"
                  value={newInterviewer.department}
                  onChangeText={(text) => setNewInterviewer((prev) => ({ ...prev, department: text }))}
                />
                <Button label="Add Interviewer" onPress={addInterviewer} />
              </Card>

              <Text style={styles.sectionTitle}>Current Interviewers ({interviewers.length})</Text>
              {interviewers.map((interviewer) => (
                <View key={interviewer.id} style={[styles.interviewerRow, { borderBottomColor: theme.border }]}> 
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.interviewerName, { color: theme.text }]}>{interviewer.name}</Text>
                    <Text style={[styles.interviewerSub, { color: theme.textSecondary }]}> {interviewer.role || '—'} • {interviewer.email || '—'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteInterviewer(interviewer.id)}>
                    <Trash2 size={18} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showJobFilterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, maxHeight: '70%' }]}> 
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Position</Text>
              <TouchableOpacity onPress={() => setShowJobFilterModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {positionOptions.map((option) => (
                <TouchableOpacity key={option} style={styles.optionRow} onPress={() => { setSelectedJobFilter(option); setShowJobFilterModal(false); }}>
                  <Text style={[styles.optionLabel, { color: theme.text }]}>{option}</Text>
                </TouchableOpacity>
              ))}
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
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
    color: '#64748B',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTextWrap: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  pageSubtitle: {
    fontSize: 13,
    marginTop: 4,
    fontFamily: 'Times New Roman',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    fontSize: 14,
    fontFamily: 'Times New Roman',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  filterBtnText: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: 'Times New Roman',
  },
  manageBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsText: {
    fontSize: 13,
    marginBottom: 12,
    fontFamily: 'Times New Roman',
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  itemSub: {
    fontSize: 12,
    fontFamily: 'Times New Roman',
    marginTop: 2,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Times New Roman',
    marginLeft: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Times New Roman',
    textDecorationLine: 'underline',
    marginLeft: 8,
  },
  cancelLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelLinkText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
    marginLeft: 6,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#64748B',
    fontFamily: 'Times New Roman',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  paginationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationBtnDisabled: {
    opacity: 0.45,
  },
  paginationBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  paginationText: {
    marginHorizontal: 14,
    fontSize: 13,
    fontFamily: 'Times New Roman',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0F172A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Times New Roman',
  },
  modalBody: {
    padding: 20,
  },
  infoBox: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    fontFamily: 'Times New Roman',
    marginBottom: 4,
  },
  modeBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Times New Roman',
  },
  modeBtnTextActive: {
    color: '#0F172A',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 4,
    fontFamily: 'Times New Roman',
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Times New Roman',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Times New Roman',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  pickerRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pickerBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Times New Roman',
  },
  chipTextActive: {
    color: '#fff',
  },
  aiContainer: {
    backgroundColor: '#F8FBFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E4FF',
  },
  aiDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
    fontFamily: 'Times New Roman',
  },
  linkCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93C5FD',
    marginTop: 10,
  },
  linkLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
    fontFamily: 'Times New Roman',
  },
  linkUrl: {
    fontSize: 12,
    color: '#1D4ED8',
    textDecorationLine: 'underline',
    fontFamily: 'Times New Roman',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    fontFamily: 'Times New Roman',
  },
  interviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  interviewerName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  interviewerSub: {
    fontSize: 12,
    fontFamily: 'Times New Roman',
    marginTop: 2,
  },
  optionRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: 'Times New Roman',
  },
});

export default InterviewsListScreen;
