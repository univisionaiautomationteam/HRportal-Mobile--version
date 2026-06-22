import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, ScrollView, StatusBar, Platform } from 'react-native';
//import { WebView } from 'react-native-webview';
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

  const [activeTab, setActiveTab] = useState<'workflow' | 'accepted' | 'pending'>('workflow');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);

  const [workflowEmails, setWorkflowEmails] = useState<any>({
    Stage1: [], Stage2: [], Stage3: [], HR: []
  });

  const [showMailModal, setShowMailModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);

  const [mailData, setMailData] = useState<any>({
    to: "", cc: "", subject: "", body: "", file: null
  });
  const [mailLoading, setMailLoading] = useState(false);

  const [offerFormData, setOfferFormData] = useState({
    name: '',
    location: '',
    role: '',
    salary: '',
    fixedSalary: '',
    variableSalary: '',
    variableType: '',
    date: '',
    experience: 'fresher',
    templateType: 'col',
  });
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [showOfferActionModal, setShowOfferActionModal] = useState(false);
  const [generatingOffer, setGeneratingOffer] = useState(false);

  /* ================= FETCH DATA ================= */

  const loadData = async () => {
    try {
      setLoading(true);
      let offRes;
      if (activeTab === "accepted") {
        offRes = await offersAPI.getAcceptedByMe();
      } else if (activeTab === "pending") {
        offRes = await offersAPI.getMyPending();
      } else {
        offRes = await offersAPI.getAll();
      }

      setOffers(offRes.data || []);

      const workflowRes = await offersAPI.getWorkflowEmails();
      if (workflowRes.status === 200 || workflowRes.status === 201) {
        const grouped: any = { Stage1: [], Stage2: [], Stage3: [], HR: [] };
        workflowRes.data.forEach((item: any) => {
          if (grouped[item.stage]) grouped[item.stage].push(item.email);
        });
        setWorkflowEmails(grouped);
      }
    } catch (err) {
      console.error('Failed to load offers:', err);
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

  /* ================= NEXT STAGE LOGIC ================= */

  const getNextStageEmails = (offer: any) => {
    if (!offer) return [];
    // Workflow not started → Stage1
    if (!offer.current_stage || offer.stage1_status === "-" || offer.stage1_status === null) {
      return workflowEmails.Stage1;
    }
    // Stage1 approved → Stage2
    if (offer.stage1_status === "Approved" && offer.current_stage === 2) {
      return workflowEmails.Stage2;
    }
    // Stage2 approved → Stage3
    if (offer.stage2_status === "Approved" && offer.current_stage === 3) {
      return workflowEmails.Stage3;
    }
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

  const openMailPopup = (offer: any) => {
    setSelectedOffer(offer);
    setMailData({
      to: "",
      cc: workflowEmails.HR.join(", "),
      subject: `Offer Approval - ${offer.position}`,
      body: `Dear Sir/Madam,

          Please review the offer details below for approval.

          Candidate Name : ${offer.custom_first_name} ${offer.custom_last_name}
          Position       : ${offer.position}
          Proposed Salary: ${offer.salary || 'As discussed'}

          Kindly approve or reject the offer.

          Regards,
          HR Team`,
      file: null
    });
    setShowMailModal(true);
  };

  const openOfferLetterPopup = (offer: any) => {
    setSelectedOffer(offer);
    setMailData({
      to: offer.email_id || "",
      cc: workflowEmails.HR.join(", "),
      subject: `Offer Letter - ${offer.position}`,
      body: `Dear ${offer.custom_first_name},

Congratulations!

We are pleased to offer you the position of ${offer.position}.

Please find the attached offer letter.

Regards,
HR Team`,
      file: null
    });
    setShowMailModal(true);
  };

  const handleGenerateOffer = async () => {
    try {
      setGeneratingOffer(true);
      const res = await fetch("http://10.60.102.146:5000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offerFormData)
      });
      if (res.ok) {
        const data = await res.json();
        // Construct the EXACT preview wrapper the user requested
        const previewWrapperHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Preview</title>
  <style>
    body{ background:#dcdcdc; margin:0; padding:10px; font-family:Arial, sans-serif; }
    .pdf-page{ width:210mm; min-height:297mm; margin:10px auto; padding:20mm; background:white; box-shadow:0 0 10px rgba(0,0,0,0.2); box-sizing:border-box; overflow:hidden; page-break-after:always; }
    #approveBtn, #downloadBtn{ margin-top:20px; padding:12px 24px; font-size:16px; border:none; background:#007bff; color:white; border-radius:6px; cursor:pointer; margin-right:10px; }
    #approveBtn:hover, #downloadBtn:hover{ background:#0056b3; }
  </style>
</head>
<body>
<div id="previewWrapper"></div>
<div class="btn-container">
  <button id="downloadBtn">Download PDF</button>
  <button id="approveBtn">Approve & Send</button>
</div>
<script>
const rawHtml = \`${data.html.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
const pages = rawHtml.split('<div class="page-break"></div>');
const wrapper = document.getElementById("previewWrapper");
wrapper.innerHTML = pages.map(page => '<div class="pdf-page" contenteditable="true">' + page + '</div>').join("");

function getUpdatedHtml() {
  const previewContent = wrapper.innerHTML;
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;padding:0;font-family:Arial,sans-serif;}</style></head><body>' + previewContent + '</body></html>';
}

document.getElementById("downloadBtn").addEventListener("click", () => {
  window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'DOWNLOAD', html: getUpdatedHtml() }));
});

document.getElementById("approveBtn").addEventListener("click", () => {
  const email = prompt("Enter candidate email");
  if(email) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'SEND', email: email, html: getUpdatedHtml() }));
  } else {
    alert("Email is required");
  }
});
</script>
</body>
</html>
        `;

        setGeneratedHtml(previewWrapperHtml);
        setShowOfferForm(false);
        setShowOfferActionModal(true);
      } else {
        Alert.alert("Error", "Failed to generate offer letter.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to generate offer letter.");
    } finally {
      setGeneratingOffer(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.action === 'SEND') {
        setGeneratingOffer(true);
        const res = await fetch("http://10.60.102.146:5000/api/send-mail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html: data.html, email: data.email })
        });
        if (res.ok) {
          Alert.alert("Success", "Mail Sent");
          setShowOfferActionModal(false);
        } else {
          Alert.alert("Error", "Failed to send mail");
        }
        setGeneratingOffer(false);
      } else if (data.action === 'DOWNLOAD') {
        Alert.alert("Notice", "PDF Download requested! (Note: React Native requires additional modules like rn-fetch-blob to save files directly to the device. Please use the web portal for direct PDF downloading.)");
      }
    } catch (err) {
      console.error(err);
      setGeneratingOffer(false);
    }
  };

  const handleSendMail = async () => {
    if (!mailData.to) return Alert.alert("Required", "Please select or enter an email address.");

    setMailLoading(true);
    try {
      const formData = new FormData();
      formData.append("candidate_id", selectedOffer.candidate_id);
      formData.append("offer_id", selectedOffer.offer_id);
      formData.append("cc", mailData.cc);
      formData.append("subject", mailData.subject);
      formData.append("body", mailData.body);

      // Mobile file attachment would go here if implemented with a picker
      // if (mailData.file) { formData.append("offerFile", mailData.file); }

      if (selectedOffer.overall_status === "Approved") {
        formData.append("to", mailData.to);
        await offersAPI.sendOfferLetter(formData);
      } else {
        formData.append("nextEmail", mailData.to);
        await offersAPI.workflow(selectedOffer.offer_id, formData);
      }

      Alert.alert("Success", "Mail sent successfully.");
      setShowMailModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Mail failed.");
    } finally {
      setMailLoading(false);
    }
  };

  const handleRemoveWorkflow = (id: string) => {
    Alert.alert("Confirm Remove", "Remove this workflow?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try {
          await offersAPI.delete(id);
          Alert.alert("Success", "Workflow removed successfully");
          loadData();
        } catch (e) {
          Alert.alert("Error", "Failed to remove workflow.");
        }
      }}
    ]);
  };

  /* ================= EMAIL MANAGEMENT ================= */

  const addEmail = (stage: string) => {
    setWorkflowEmails({
      ...workflowEmails,
      [stage]: [...workflowEmails[stage], ""]
    });
  };

  const updateEmail = (stage: string, index: number, value: string) => {
    const updated = [...workflowEmails[stage]];
    updated[index] = value;
    setWorkflowEmails({ ...workflowEmails, [stage]: updated });
  };

  const removeEmail = (stage: string, index: number) => {
    const updated = [...workflowEmails[stage]];
    updated.splice(index, 1);
    setWorkflowEmails({ ...workflowEmails, [stage]: updated });
  };

  const saveWorkflowEmails = async () => {
    try {
      await offersAPI.saveWorkflowEmails(workflowEmails);
      Alert.alert("Success", "Emails saved");
      setShowManageModal(false);
      loadData();
    } catch {
      Alert.alert("Error", "Save failed");
    }
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
            <Text style={[styles.candEmail, { color: theme.textSecondary }]}>{item.email_id}</Text>
          </View>
          <View style={[styles.overallBadge, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[styles.overallBadgeText, { color: '#475569' }]}>{item.overall_status || "Not Started"}</Text>
          </View>
        </View>

        <View style={styles.workflowRow}>
          <StageItem label="Stage1" status={item.stage1_status} user={item.stage1_approved_by} />
          <StageItem label="Stage2" status={item.stage2_status} user={item.stage2_approved_by} />
          <StageItem label="Stage3" status={item.stage3_status} user={item.stage3_approved_by} />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.cardFooter}>
          <View style={{ flex: 1 }}>
            {accepted ? <Text style={styles.acceptedText}>✔ Candidate Accepted Offer</Text> :
             rejected ? <Text style={styles.rejectedText}>✖ Candidate Rejected Offer</Text> : null}
          </View>

          <View style={styles.actions}>
            {!accepted && !rejected && (
              <>
                {item.overall_status === "Approved" && isStage3Sender ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={() => openOfferLetterPopup(item)}>
                    <Send size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Send Offer Letter</Text>
                  </TouchableOpacity>
                ) : canAssignStage(item) && item.overall_status !== "Approved" ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={() => openMailPopup(item)}>
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
          <Text style={[styles.pageTitle, { color: theme.text }]}>Offer Workflow Management</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>NOTE: All the offers are accepted by the Outlook or Gmail only</Text>
        </View>
        {userRole?.toLowerCase() === "hr manager" && (
          <TouchableOpacity style={styles.manageBtn} onPress={() => setShowManageModal(true)}>
            <Text style={styles.manageBtnText}>Manage Workflow Emails</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.tabs, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'workflow' && styles.tabActive]}
          onPress={() => setActiveTab('workflow')}
        >
          <Text style={[styles.tabText, activeTab === 'workflow' && { color: '#fff' }]}>Workflow</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && { color: '#fff' }]}>Pending For You</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'accepted' && styles.tabActive]}
          onPress={() => setActiveTab('accepted')}
        >
          <Text style={[styles.tabText, activeTab === 'accepted' && { color: '#fff' }]}>You Accepted</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={offers}
        keyExtractor={(item) => (item.offer_id || item.candidate_id).toString()}
        renderItem={renderOfferItem}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={
          <View style={styles.noData}>
            <Text style={[styles.noDataTitle, { color: theme.text }]}>No offers found</Text>
            <Text style={[styles.noDataSub, { color: theme.textSecondary }]}>Please add resumes and start the offer workflow to see candidates here.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <TouchableOpacity style={[styles.assignBtn, { paddingHorizontal: 24, paddingVertical: 12 }]} onPress={() => setShowOfferForm(true)}>
              <Text style={styles.actionBtnText}>Create Offer</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* MAIL MODAL */}
      <Modal visible={showMailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeaderBox}>
              <Text style={styles.modalTitle}>
                {selectedOffer?.overall_status === "Approved" ? "Send Offer Letter" : "Assign Workflow Stage"}
              </Text>
              <TouchableOpacity onPress={() => setShowMailModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.label}>To</Text>
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

              <Text style={styles.label}>Body</Text>
              <TextInput
                style={[styles.textArea, { borderColor: theme.border }]}
                multiline
                numberOfLines={6}
                value={mailData.body}
                onChangeText={t => setMailData({...mailData, body: t})}
              />

              <View style={styles.modalActions}>
                <Button
                  label={mailLoading ? "Sending..." : "Send Mail"}
                  onPress={handleSendMail}
                  loading={mailLoading}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Cancel"
                  variant="outline"
                  onPress={() => setShowMailModal(false)}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MANAGE MODAL */}
      <Modal visible={showManageModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, height: '80%' }]}>
            <View style={styles.modalHeaderBox}>
              <Text style={styles.modalTitle}>Manage Workflow Emails</Text>
              <TouchableOpacity onPress={() => setShowManageModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {Object.keys(workflowEmails).map((stage) => (
                <View key={stage} style={styles.manageSection}>
                  <Text style={styles.stageHeading}>{stage}</Text>
                  {workflowEmails[stage].map((email: string, i: number) => (
                    <View key={i} style={styles.emailEditRow}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        value={email}
                        onChangeText={(val) => updateEmail(stage, i, val)}
                      />
                      <TouchableOpacity onPress={() => removeEmail(stage, i)} style={styles.deleteIcon}>
                        <Trash2 size={20} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addEmailBtn} onPress={() => addEmail(stage)}>
                    <Text style={[styles.addEmailText, { color: theme.primary }]}>+ Add Email</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.modalActions}>
                <Button label="Save" onPress={saveWorkflowEmails} style={{ flex: 1 }} />
                <Button label="Cancel" variant="outline" onPress={() => setShowManageModal(false)} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CREATE OFFER MODAL */}
      <Modal visible={showOfferForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, height: '90%' }]}>
            <View style={styles.modalHeaderBox}>
              <Text style={styles.modalTitle}>Generate Offer Letter</Text>
              <TouchableOpacity onPress={() => setShowOfferForm(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.label}>Candidate Name</Text>
              <TextInput style={[styles.input, { borderColor: theme.border }]} value={offerFormData.name} onChangeText={t => setOfferFormData({...offerFormData, name: t})} />
              
              <Text style={styles.label}>Location</Text>
              <TextInput style={[styles.input, { borderColor: theme.border }]} value={offerFormData.location} onChangeText={t => setOfferFormData({...offerFormData, location: t})} />

              <Text style={styles.label}>Role</Text>
              <TextInput style={[styles.input, { borderColor: theme.border }]} value={offerFormData.role} onChangeText={t => setOfferFormData({...offerFormData, role: t})} />

              <Text style={styles.label}>Total Salary</Text>
              <TextInput style={[styles.input, { borderColor: theme.border }]} value={offerFormData.salary} keyboardType="numeric" onChangeText={t => setOfferFormData({...offerFormData, salary: t})} />

              <Text style={styles.label}>Fixed Salary</Text>
              <TextInput style={[styles.input, { borderColor: theme.border }]} value={offerFormData.fixedSalary} keyboardType="numeric" onChangeText={t => setOfferFormData({...offerFormData, fixedSalary: t})} />

              <Text style={styles.label}>Variable Salary</Text>
              <TextInput style={[styles.input, { borderColor: theme.border }]} value={offerFormData.variableSalary} keyboardType="numeric" onChangeText={t => setOfferFormData({...offerFormData, variableSalary: t})} />

              <Text style={styles.label}>Variable Type</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity style={[styles.emailPill, offerFormData.variableType === 'Year End Bonus' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setOfferFormData({...offerFormData, variableType: 'Year End Bonus'})}>
                  <Text style={[styles.emailPillText, offerFormData.variableType === 'Year End Bonus' && { color: '#fff' }]}>Year End</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.emailPill, offerFormData.variableType === 'Quarterly Bonus' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setOfferFormData({...offerFormData, variableType: 'Quarterly Bonus'})}>
                  <Text style={[styles.emailPillText, offerFormData.variableType === 'Quarterly Bonus' && { color: '#fff' }]}>Quarterly</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.emailPill, offerFormData.variableType === 'Joining Bonus' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setOfferFormData({...offerFormData, variableType: 'Joining Bonus'})}>
                  <Text style={[styles.emailPillText, offerFormData.variableType === 'Joining Bonus' && { color: '#fff' }]}>Joining</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.emailPill, offerFormData.variableType === 'NA' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setOfferFormData({...offerFormData, variableType: 'NA'})}>
                  <Text style={[styles.emailPillText, offerFormData.variableType === 'NA' && { color: '#fff' }]}>NA</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Joining Date</Text>
              <TextInput style={[styles.input, { borderColor: theme.border }]} value={offerFormData.date} placeholder="YYYY-MM-DD" onChangeText={t => setOfferFormData({...offerFormData, date: t})} />

              <Text style={styles.label}>Experience Level</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity style={[styles.emailPill, offerFormData.experience === 'fresher' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setOfferFormData({...offerFormData, experience: 'fresher'})}>
                  <Text style={[styles.emailPillText, offerFormData.experience === 'fresher' && { color: '#fff' }]}>Fresher</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.emailPill, offerFormData.experience === 'experienced' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setOfferFormData({...offerFormData, experience: 'experienced'})}>
                  <Text style={[styles.emailPillText, offerFormData.experience === 'experienced' && { color: '#fff' }]}>Experienced</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Template Type</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity style={[styles.emailPill, offerFormData.templateType === 'col' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setOfferFormData({...offerFormData, templateType: 'col'})}>
                  <Text style={[styles.emailPillText, offerFormData.templateType === 'col' && { color: '#fff' }]}>Conditional (COL)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.emailPill, offerFormData.templateType === 'fol' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setOfferFormData({...offerFormData, templateType: 'fol'})}>
                  <Text style={[styles.emailPillText, offerFormData.templateType === 'fol' && { color: '#fff' }]}>Formal (FOL)</Text>
                </TouchableOpacity>
              </View>

              <Button label={generatingOffer ? "Generating..." : "Generate HTML Preview"} onPress={handleGenerateOffer} loading={generatingOffer} style={{ marginTop: 10 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* OFFER ACTION MODAL */}
      <Modal visible={showOfferActionModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.background }]}>
          <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: theme.surface, borderBottomWidth: 1, borderColor: theme.border }}>
              <Text style={styles.modalTitle}>Offer Preview</Text>
              <TouchableOpacity onPress={() => setShowOfferActionModal(false)}>
                <X color={theme.text} size={24} />
              </TouchableOpacity>
            </View>

            {/* The actual HTML preview matching the exact CSS requested */}
            <View style={{ flex: 1 }}>
              {/*} <WebView 
                 originWhitelist={['*']}
                 source={{ html: generatedHtml }}
                 style={{ flex: 1 }}
                 onMessage={handleWebViewMessage}
                 javaScriptEnabled={true}
                 domStorageEnabled={true}
                 scalesPageToFit={true}
                 showsHorizontalScrollIndicator={false}
               />
               */}
            </View>
            
            {/* Loading Overlay */}
            {generatingOffer && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' }}>
                 <ActivityIndicator size="large" color={theme.primary} />
                 <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Sending Offer...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const StageItem = ({ label, status, user }: any) => {
  const isApproved = status === "Approved";
  const isRejected = status === "Rejected";
  const isPending = status === "Pending";

  const color = isApproved ? "#16a34a" : isRejected ? "#dc2626" : isPending ? "#f59e0b" : "#64748B";

  return (
    <View style={styles.stageItem}>
      <Text style={styles.stageLabel}>{label}</Text>
      <Text style={[styles.stageStatus, { color }]}>
        {isApproved ? "✔ Approved" : isRejected ? "✖ Rejected" : status || "-"}
      </Text>
      {user ? <Text style={styles.stageUser} numberOfLines={1}>{user}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  pageSubtitle: {
    fontSize: 12,
    fontFamily: 'Times New Roman',
    marginTop: 4,
    fontWeight: '600',
  },
  manageBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  manageBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#1f3c88',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
    color: '#64748B',
  },
  offerCard: {
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  candName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  candSub: {
    fontSize: 13,
    fontFamily: 'Times New Roman',
    marginTop: 2,
  },
  candEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  overallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  overallBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  workflowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  stageItem: {
    flex: 1,
  },
  stageLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1f3c88',
    marginBottom: 2,
  },
  stageStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  stageUser: {
    fontSize: 9,
    color: '#777',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  acceptedText: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: 12,
  },
  rejectedText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  trashBtn: {
    padding: 6,
  },
  noData: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  noDataSub: {
    textAlign: 'center',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeaderBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1f3c88',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  input: {
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 13,
    backgroundColor: '#f9fafb',
  },
  textArea: {
    minHeight: 100,
    borderRadius: 6,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    fontSize: 13,
    textAlignVertical: 'top',
    backgroundColor: '#f9fafb',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  emailPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#f1f5ff',
  },
  emailPillText: {
    fontSize: 11,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    fontStyle: 'italic',
  },
  manageSection: {
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  stageHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  emailEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  deleteIcon: {
    padding: 4,
  },
  addEmailBtn: {
    marginTop: 4,
  },
  addEmailText: {
    fontSize: 13,
    fontWeight: '600',
  },
  assignBtn: {
  backgroundColor: '#1f3c88',
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
}
});

export default OffersListScreen;

