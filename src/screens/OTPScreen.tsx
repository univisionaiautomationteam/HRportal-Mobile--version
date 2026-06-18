import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import { authAPI } from '../services/apiService';
import Button from '../components/Button';

export const OTPScreen = ({ route, navigation }: any) => {
  const { theme } = useTheme();
  const { login } = useAuth();
  const { userId } = route.params || { userId: '' };
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (otp.length < 4) {
      setError('Please enter a valid verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyOTP(userId, otp);
      if (response.data.token && response.data.user) {
        await login(response.data.token, response.data.user);
      } else {
        setError('Verification failed.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Invalid OTP code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Enter OTP Code</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Type the 6-digit code shown in your authenticator application.
          </Text>

          {error ? (
            <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
          ) : null}

          <TextInput
            style={[
              styles.input, 
              { 
                color: theme.text, 
                borderColor: theme.border, 
                backgroundColor: theme.background 
              }
            ]}
            placeholder="000 000"
            placeholderTextColor={theme.placeholder}
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(txt) => {
              setOtp(txt.replace(/[^0-9]/g, ''));
              setError('');
            }}
            textAlign="center"
          />

          <Button
            label="Verify Code"
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length < 4}
            style={styles.verifyBtn}
          />

          <Button
            label="Back to Login"
            variant="outline"
            onPress={() => navigation.navigate('Login')}
            style={styles.cancelBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: SIZES.xl,
    justifyContent: 'center',
  },
  card: {
    padding: SIZES.xl,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    ...TYPOGRAPHY.h2,
    textAlign: 'center',
    marginBottom: SIZES.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
  error: {
    ...TYPOGRAPHY.captionBold,
    textAlign: 'center',
    marginBottom: SIZES.md,
  },
  input: {
    height: 54,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    marginBottom: SIZES.xl,
  },
  verifyBtn: {
    marginBottom: SIZES.sm,
  },
  cancelBtn: {
    marginVertical: SIZES.xs,
  },
});
export default OTPScreen;
