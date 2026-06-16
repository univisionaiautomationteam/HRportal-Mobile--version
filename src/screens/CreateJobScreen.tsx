import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import { jobsAPI } from '../services/apiService';
import Button from '../components/Button';
import { ChevronLeft } from 'lucide-react-native';

export const CreateJobScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    client_name: "",
    experience_required: "",
    location: "",
    notice_period: "",
    skills: "",
    job_description: ""
  });

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      Alert.alert('Required', 'Job Title is mandatory.');
      return;
    }

    setLoading(true);
    try {
      await jobsAPI.create(formData);
      Alert.alert('Success', 'Job opening created successfully.');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to create job opening.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.text }]}>Create Job</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Fill in the details below to post a new opening.
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.formRow}>
            <View style={styles.formItem}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Job Title *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="e.g. Senior React Developer"
                placeholderTextColor={theme.placeholder}
                value={formData.title}
                onChangeText={(val) => handleChange('title', val)}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formItem}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Client Name</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="e.g. Acme Corp"
                placeholderTextColor={theme.placeholder}
                value={formData.client_name}
                onChangeText={(val) => handleChange('client_name', val)}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formItem}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Experience Required</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="e.g. 3-5 years"
                placeholderTextColor={theme.placeholder}
                value={formData.experience_required}
                onChangeText={(val) => handleChange('experience_required', val)}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formItem}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Location</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="e.g. Bangalore, Remote"
                placeholderTextColor={theme.placeholder}
                value={formData.location}
                onChangeText={(val) => handleChange('location', val)}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formItem}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Notice Period</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="e.g. 30 days, Immediate"
                placeholderTextColor={theme.placeholder}
                value={formData.notice_period}
                onChangeText={(val) => handleChange('notice_period', val)}
              />
            </View>
          </View>

          <View style={styles.formItem}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Skills</Text>
            <TextInput
              style={[styles.textArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="e.g. React, Node.js, PostgreSQL"
              placeholderTextColor={theme.placeholder}
              multiline
              numberOfLines={3}
              value={formData.skills}
              onChangeText={(val) => handleChange('skills', val)}
            />
          </View>

          <View style={styles.formItem}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Job Description</Text>
            <TextInput
              style={[styles.textArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, minHeight: 120 }]}
              placeholder="Describe the role, responsibilities, and requirements..."
              placeholderTextColor={theme.placeholder}
              multiline
              numberOfLines={5}
              value={formData.job_description}
              onChangeText={(val) => handleChange('job_description', val)}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Create Job</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    marginBottom: 32,
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
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Times New Roman',
    marginTop: 4,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 4,
  },
  formRow: {
    marginBottom: 4,
  },
  formItem: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Times New Roman',
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 2,
    padding: 16,
    fontSize: 14,
    fontFamily: 'Times New Roman',
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
});

export default CreateJobScreen;
