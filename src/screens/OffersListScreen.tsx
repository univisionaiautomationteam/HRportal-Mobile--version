import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, ScrollView, StatusBar, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import { offersAPI } from '../services/apiService';
import Button from '../components/Button';
import Card from '../components/Card';
import {
  FileText,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Trash2,
  Settings,
  ChevronRight,
  X,
  User,
  Plus
} from 'lucide-react-native';

export const OffersListScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const userRole = user?.role;
  const userEmail = (user as any)?.email || '';

  const [activeTab, setActiveTab] = useState<'workflow' | 'accepted'>('workflow');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);

  const [workflowEmails, setWorkflowEmails] = useState<any>({
    Stage1: [], Stage2: [], Stage3: [], HR: []
  });

  const [showMailModal, setShowMailModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [mailData, setMailData] = useState({
    to: "", cc: "", subject: "", body: ""
  });
  const [mailLoading, setMailLoading] = useState(false);

  /* ================= FETCH DATA ================= */

  const loadData = async () => {
    try {
      setLoading(true);
      const [offRes, workflowRes] = await Promise.allSettled([
        activeTab === "accepted" ? offersAPI.getAcceptedByMe() : offersAPI.getAll(),
        offersAPI.getWorkflowEmails()
      ]);

      if (offRes.status === 'fulfilled') setOffers(offRes.value.data || []);

      if (workflowRes.status === 'fulfilled') {
        const grouped: any = { Stage1: [], Stage2: [], Stage3: [], HR: [] };
        workflowRes.value.data.forEach((item: any) => {
          if (grouped[item.stage]) grouped[item.stage].push(item.email);
        });
        setWorkflowEmails(grouped);
      }
    } catch (err) {
      console.error(err);
      // Mock fallback
      setOffers(getMockOffers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /* ================= WORKFLOW LOGIC ================= */

  const getNextStageEmails = (offer: any) => {
    if (!offer) return [];
    if (!offer.current_stage || !offer.stage1_status || offer.stage1_status === "-") return workflowEmails.Stage1;
    if (offer.stage1_status === "Approved" && offer.current_stage === 2) return workflowEmails.Stage2;
    if (offer.stage2_status === "Approved" && offer.current_stage === 3) return workflowEmails.Stage3;
    return [];
  };

  const canAssignStage = (offer: any) => {
    const loginEmail = userEmail?.toLowerCase();
    if (!offer.offer_id || offer.overall_status === "Not Started") return true;
    if (offer.stage1_status === "Approved" && offer.current_stage === 2 && offer.stage1_approved_by?.toLowerCase() === loginEmail) return true;
    if (offer.stage2_status === "Approved" && offer.current_stage === 3 && offer.stage2_approved_by?.toLowerCase() === loginEmail) return true;
    if (!offer.stage1_status || offer.stage1_status === "-") return true;
    return false;
  };

  const openMailPopup = (offer: any, type: 'approval' | 'letter') => {
    setSelectedOffer(offer);
    if (type === 'letter') {
      setMailData({
        to: offer.email_id || "",
        cc: workflowEmails.HR.join(", "),
        subject: `Offer Letter - ${offer.position}`,
        body: `Dear ${offer.custom_first_name},\n\nCongratulations!\n\nWe are pleased to offer you the position of ${offer.position}.\n\nRegards,\nHR Team`,
      });
    } else {
      setMailData({
        to: "",
        cc: workflowEmails.HR.join(", "),
        subject: `Offer Approval - ${offer.position}`,
        body: `Dear Sir/Madam,\n\nPlease review the offer details for approval:\nCandidate: ${offer.custom_first_name} ${offer.custom_last_name}\nPosition: ${offer.position}\n\nRegards,\nHR Team`,
      });
    }
    setShowMailModal(true);
  };

  const handleSendMail = async () => {
    if (!mailData.to) return Alert.alert("Required", "Please select or enter an email address.");

    setMailLoading(true);
    try {
      const payload = {
        candidate_id: selectedOffer.candidate_id,
        offer_id: selectedOffer.offer_id,
        cc: mailData.cc,
        subject: mailData.subject,
        body: mailData.body,
        to: mailData.to
      };

      if (selectedOffer.overall_status === "Approved") {
        await offersAPI.sendOfferLetter(payload);
      } else {
        // Correct endpoint for workflow nextEmail
        await offersAPI.workflow(selectedOffer.offer_id, { ...payload, nextEmail: mailData.to });
      }

      Alert.alert("Success", "Workflow email sent successfully.");
      setShowMailModal(false);
      loadData();
    } catch (err) {
      Alert.alert("Error", "Failed to send email.");
    } finally {
      setMailLoading(false);
    }
  };

  const handleRemoveWorkflow = (id: string) => {
    Alert.alert("Confirm Remove", "Are you sure you want to remove this workflow?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try {
          await offersAPI.delete(id);
          loadData();
        } catch (e) {
          Alert.alert("Error", "Failed to remove workflow.");
        }
      }}
    ]);
  };

  /* ================= RENDER ================= */

  const renderOfferItem = ({ item }: { item: any }) => {
    const accepted = Number(item.offer_accepted) === 1;
    const rejected = Number(item.offer_rejected) === 1;
    const isStage3Sender = item.stage3_approved_by?.toLowerCase() === userEmail?.toLowerCase();

    return (
      <Card style={styles.offerCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.candName, { color: theme.text }]}>{item.custom_first_name} {item.custom_last_name}</Text>
            <Text style={[styles.candSub, { color: theme.textSecondary }]}>{item.position}</Text>
          </View>
          <View style={[styles.overallBadge, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[styles.overallBadgeText, { color: '#475569' }]}>{item.overall_status || "Not Started"}</Text>
          </View>
        </View>

        <View style={styles.workflowRow}>
          <StageBadge label="S1" status={item.stage1_status} user={item.stage1_approved_by} />
          <StageBadge label="S2" status={item.stage2_status} user={item.stage2_approved_by} />
          <StageBadge label="S3" status={item.stage3_status} user={item.stage3_approved_by} />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.cardFooter}>
          <View style={{ flex: 1 }}>
            {accepted ? <Text style={styles.acceptedText}>✔ Accepted</Text> :
             rejected ? <Text style={styles.rejectedText}>✖ Rejected</Text> : null}
          </View>

          <View style={styles.actions}>
            {!accepted && !rejected && (
              <>
                {item.overall_status === "Approved" && isStage3Sender ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={() => openMailPopup(item, 'letter')}>
                    <Send size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Send Offer</Text>
                  </TouchableOpacity>
                ) : canAssignStage(item) && item.overall_status !== "Approved" ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={() => openMailPopup(item, 'approval')}>
                    <Clock size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Assign Stage</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}

            {userRole?.toLowerCase() === "hr manager" && (
              <TouchableOpacity style={styles.trashBtn} onPress={() => handleRemoveWorkflow(item.offer_id)}>
                <Trash2 size={18} color={theme.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Offer Workflow</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>Manage approvals and offer letters</Text>
        </View>
        {userRole?.toLowerCase() === "hr manager" && (
          <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowManageModal(true)}>
            <Settings size={20} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.tabs, { backgroundColor: theme.surface }]}>
        {(['workflow', 'accepted'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && { color: '#fff' }]}>{t === 'workflow' ? 'All Active' : 'My Accepted'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={offers}
        keyExtractor={(item) => (item.offer_id || item.candidate_id).toString()}
        renderItem={renderOfferItem}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={{ padding: 24, paddingTop: 8 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No offers found.</Text>}
      />

      <Modal visible={showMailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedOffer?.overall_status === "Approved" ? "Send Offer Letter" : "Assign Approval Stage"}
              </Text>
              <TouchableOpacity onPress={() => setShowMailModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.label}>Recipient Email *</Text>
              {selectedOffer?.overall_status === "Approved" ? (
                <TextInput
                  style={[styles.input, { borderColor: theme.border }]}
                  placeholder="candidate@email.com"
                  value={mailData.to}
                  onChangeText={t => setMailData({...mailData, to: t})}
                />
              ) : (
                <View style={styles.pickerContainer}>
                  {getNextStageEmails(selectedOffer).map((email: string) => (
                    <TouchableOpacity 
                      key={email}
                      style={[styles.emailPill, mailData.to === email && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                      onPress={() => setMailData({...mailData, to: email})}
                    >
                      <Text style={[styles.emailPillText, mailData.to === email && { color: '#fff' }]}>{email}</Text>
                    </TouchableOpacity>
                  ))}
                  {!getNextStageEmails(selectedOffer).length && <Text style={styles.errorText}>No approvers configured for this stage.</Text>}
                </View>
              )}

              <Text style={styles.label}>CC</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border }]}
                value={mailData.cc}
                onChangeText={t => setMailData({...mailData, cc: t})}
              />

              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border }]}
                value={mailData.subject}
                onChangeText={t => setMailData({...mailData, subject: t})}
              />

              <Text style={styles.label}>Message Body</Text>
              <TextInput
                style={[styles.textArea, { borderColor: theme.border }]}
                multiline
                numberOfLines={8}
                value={mailData.body}
                onChangeText={t => setMailData({...mailData, body: t})}
              />

              <Button
                label={mailLoading ? "Sending..." : "Dispatch Email"}
                onPress={handleSendMail}
                loading={mailLoading}
                style={{ marginTop: 20 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const StageBadge = ({ label, status, user }: any) => {
  const color = status === "Approved" ? "#059669" : status === "Rejected" ? "#DC2626" : "#64748B";
  const bg = status === "Approved" ? "#ECFDF5" : status === "Rejected" ? "#FEE2E2" : "#F1F5F9";

  return (
    <View style={styles.stageItem}>
      <View style={[styles.stageIndicator, { backgroundColor: bg, borderColor: color }]}>
        <Text style={[styles.stageLabel, { color }]}>{label}</Text>
      </View>
      <Text style={[styles.stageStatus, { color }]} numberOfLines={1}>{status || "Pending"}</Text>
      {user ? <Text style={styles.stageUser} numberOfLines={1}>{user}</Text> : null}
    </View>
  );
};

function getMockOffers() {
  return [
    { offer_id: 'o1', candidate_id: 'c1', custom_first_name: 'Amit', custom_last_name: 'Sharma', email_id: 'amit@gmail.com', position: 'Node.js Developer', stage1_status: 'Approved', stage1_approved_by: 'manager@univision.com', current_stage: 2, overall_status: 'In Progress' },
    { offer_id: 'o2', candidate_id: 'c2', custom_first_name: 'Neha', custom_last_name: 'Patel', email_id: 'neha@gmail.com', position: 'React Native Expert', stage1_status: 'Approved', stage2_status: 'Approved', current_stage: 3, overall_status: 'Approved', stage3_approved_by: 'keerthana@univision.com' },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  pageSubtitle: {
    fontSize: 14,
    fontFamily: 'Times New Roman',
    marginTop: 4,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 24,
    padding: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
    color: '#64748B',
  },
  offerCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  candName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  candSub: {
    fontSize: 13,
    fontFamily: 'Times New Roman',
    marginTop: 2,
  },
  overallBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overallBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    textTransform: 'uppercase',
  },
  workflowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  stageItem: {
    flex: 1,
    alignItems: 'center',
  },
  stageIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stageLabel: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Times New Roman',
  },
  stageStatus: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  stageUser: {
    fontSize: 9,
    color: '#94A3B8',
    fontFamily: 'Times New Roman',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptedText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'Times New Roman',
  },
  rejectedText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'Times New Roman',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  trashBtn: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#64748B',
    fontFamily: 'Times New Roman',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  modalBody: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: 'Times New Roman',
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
    fontSize: 14,
    fontFamily: 'Times New Roman',
  },
  textArea: {
    minHeight: 120,
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    fontSize: 14,
    fontFamily: 'Times New Roman',
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  emailPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emailPillText: {
    fontSize: 12,
    fontFamily: 'Times New Roman',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: 'Times New Roman',
  }
});

export default OffersListScreen;
