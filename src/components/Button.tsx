import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  labelStyle,
}) => {
  const { theme } = useTheme();

  const getStyles = () => {
    let buttonStyle: ViewStyle = {};
    let textStyle: TextStyle = { color: '#ffffff' };

    switch (variant) {
      case 'primary':
        buttonStyle = {
          backgroundColor: theme.primary,
        };
        break;
      case 'secondary':
        buttonStyle = {
          backgroundColor: theme.accent,
        };
        break;
      case 'danger':
        buttonStyle = {
          backgroundColor: theme.danger,
        };
        break;
      case 'outline':
        buttonStyle = {
          backgroundColor: theme.transparent,
          borderWidth: 1.5,
          borderColor: theme.primary,
        };
        textStyle = {
          color: theme.primary,
        };
        break;
    }

    if (disabled || loading) {
      buttonStyle.opacity = 0.6;
    }

    return { buttonStyle, textStyle };
  };

  const { buttonStyle, textStyle } = getStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, buttonStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? theme.primary : '#ffffff'} size="small" />
      ) : (
        <Text style={[styles.text, textStyle, labelStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: SIZES.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: SIZES.lg,
  },
  text: {
    ...TYPOGRAPHY.button,
    textAlign: 'center',
  },
});
export default Button;
