import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, StatusBar, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SIZES } from '../constants/theme';
import { authAPI } from '../services/apiService';
import Button from '../components/Button';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';
import { authorize } from 'react-native-app-auth';
import { msalConfig, mobileRedirectUri, googleConfig } from '../constants/msalConfig';
import { Lock, Target } from 'lucide-react-native';

export const LoginScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBackendLogin = async (accessToken: string) => {
    try {
      setLoading(true);
      const res = await authAPI.microsoftLogin(accessToken);

      if (res.data.token && res.data.user) {
        await login(res.data.token, res.data.user);
      } else {
        throw new Error('Invalid backend response');
      }
    } catch (err: any) {
      console.error("Backend Login Error:", err);
      if (err?.response?.data?.error === 'USER_NOT_REGISTERED') {
        setErrorMessage('Your email is not registered. Please contact admin.');
      } else {
        setErrorMessage('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
  await login(
    'dummy-token',
    {
      id: '1',
      name: 'Test User',
      email: 'test@test.com',
    } as any
  );
};

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMessage('');

    try {
      const redirectUri = mobileRedirectUri;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleConfig.clientId}` +
        `&response_type=id_token` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=openid%20profile%20email` +
        `&nonce=random_nonce` +
        `&prompt=select_account`;

      if (await InAppBrowser.isAvailable()) {
        const result = await InAppBrowser.openAuth(authUrl, redirectUri, {
          // iOS Properties
          dismissButtonStyle: 'cancel',
          preferredBarTintColor: '#453AA4',
          preferredControlTintColor: 'white',
          readerMode: false,
          animated: true,
          modalPresentationStyle: 'fullScreen',
          modalTransitionStyle: 'coverVertical',
          modalEnabled: true,
          enableBarCollapsing: false,
          // Android Properties
          showTitle: true,
          toolbarColor: '#6200EE',
          secondaryToolbarColor: 'black',
          navigationBarColor: 'black',
          navigationBarDividerColor: 'white',
          enableUrlBarHiding: true,
          enableDefaultShare: true,
          forceCloseOnRedirection: false,
          // Animations
          animations: {
            startEnter: 'slide_in_right',
            startExit: 'slide_out_left',
            endEnter: 'slide_in_left',
            endExit: 'slide_out_right'
          }
        });

        if (result.type === 'success' && result.url) {
          const url = result.url;
          let idToken = '';

          if (url.includes('id_token=')) {
            idToken = url.split('id_token=')[1].split('&')[0];
          }

          if (!idToken) throw new Error('ID Token missing from Google response');

          console.log("TOKEN RECEIVED =", idToken);

          const response = await authAPI.googleLogin(idToken);
          console.log("BACKEND RESPONSE =", response.data);

          if (response.data.setup2FA) {
            navigation.navigate('Setup2FA', {
              userId: response.data.userId,
              qrCode: response.data.qrCode,
              manualKey: response.data.manualKey,
            });
            return;
          }

          if (response.data.requireOTP) {
            navigation.navigate('OTP', { userId: response.data.userId });
            return;
          }

          if (response.data.token && response.data.user) {
            await login(response.data.token, response.data.user);
          }
        }
      } else {
        Linking.openURL(authUrl);
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setErrorMessage('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0F172A' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.content}>
        <View style={styles.adminRow}>
          <TouchableOpacity 
            style={[styles.adminBtn, { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }]}
            onPress={() => navigation.navigate('AdminUser')}
          >
            <Lock size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={[styles.adminBtnText, { color: '#ffffff' }]}>Admin Login</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logo}
            defaultSource={require('../assets/logo.png')}
            resizeMode="contain"
          />
          <Text style={[styles.brandTitle, { color: '#ffffff' }]}>HR Management System</Text>
          <Text style={[styles.brandSubtitle, { color: 'rgba(255, 255, 255, 0.8)' }]}>
            Professional Recruitment Platform
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Sign in with your account to continue
          </Text>

          {errorMessage ? (
            <Text style={[styles.error, { color: '#B91C1C' }]}>{errorMessage}</Text>
          ) : null}

          <View style={styles.btnWrapper}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleMicrosoftLogin}
              disabled={loading}
              style={[
                styles.microsoftBtn,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.primary,
                  borderWidth: 2,
                }
              ]}
            >
              {loading ? (
                <ActivityIndicator color={theme.primary} size="small" />
              ) : (
                <>
                  <Lock size={18} color={theme.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.microsoftBtnText, { color: theme.primary }]}>
                    Sign in with Microsoft
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Button
              label="Sign in with Google"
              variant="outline"
              onPress={handleGoogleLogin}
              loading={loading}
              style={styles.actionBtn}
            />

            <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />

            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('StartInterview')}
                style={styles.candidateBtn}
            >
                <Target size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.candidateBtnText}>Candidate? Take AI Interview</Text>
            </TouchableOpacity>
          </View>
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
    padding: SIZES.xxl,
    justifyContent: 'center',
  },
  adminRow: {
    alignItems: 'flex-end',
    marginBottom: SIZES.xxl,
  },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  adminBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: SIZES.md,
  },
  brandTitle: {
    fontSize: 32,
    fontFamily: 'Times New Roman',
    fontWeight: '700',
    textAlign: 'center',
  },
  brandSubtitle: {
    marginTop: SIZES.xs,
    fontFamily: 'Times New Roman',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  card: {
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: 'Times New Roman',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  error: {
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Times New Roman',
    fontSize: 13,
    fontWeight: '600',
  },
  btnWrapper: {
    flexDirection: 'column',
    gap: 12,
  },
  microsoftBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: SIZES.lg,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  microsoftBtnText: {
    fontSize: 16,
    fontFamily: 'Times New Roman',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actionBtn: {
    height: 48,
  },
  divider: {
    height: 1,
    marginVertical: SIZES.md,
    width: '100%',
  },
  candidateBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  candidateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  }
});
export default LoginScreen;
