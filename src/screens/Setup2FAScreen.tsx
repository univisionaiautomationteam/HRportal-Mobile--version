import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, StyleSheet, Clipboard, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import Button from '../components/Button';
import { KeyRound, ShieldAlert } from 'lucide-react-native';

export const Setup2FAScreen = ({ route, navigation }: any) => {
  const { theme } = useTheme();
  const { userId, manualKey } = route.params || { userId: '', manualKey: 'DEMO-SECRET-KEY-123' };

  const handleCopyKey = () => {
    Clipboard.setString(manualKey);
    Alert.alert('Key Copied', 'The secret key has been copied to your clipboard. Paste it in Google Authenticator.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.iconHeader}>
            <ShieldAlert color={theme.accent} size={48} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Configure Two-Factor Auth</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Since you are logging in from a mobile device, please copy the secret key below and add it manually into your Authenticator app (e.g. Google Authenticator).
          </Text>

          <View style={[styles.keyBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <KeyRound color={theme.primary} size={20} />
            <Text style={[styles.keyText, { color: theme.text }]}>{manualKey}</Text>
          </View>

          <Button
            label="Copy Secret Key"
            variant="outline"
            onPress={handleCopyKey}
            style={styles.actionBtn}
          />

          <Button
            label="Proceed to Verification"
            variant="primary"
            onPress={() => navigation.navigate('OTP', { userId })}
            style={styles.actionBtn}
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
  iconHeader: {
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
  keyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    marginBottom: SIZES.lg,
  },
  keyText: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 16,
    marginLeft: SIZES.md,
    letterSpacing: 1.5,
  },
  actionBtn: {
    marginVertical: SIZES.sm,
  },
});
export default Setup2FAScreen;
