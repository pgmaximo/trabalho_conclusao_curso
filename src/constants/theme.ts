import { StyleSheet } from 'react-native';

export const COLORS = {
  background: '#e8f5eb',
  surface: '#ffffff',
  primary: '#21a16f',
  primaryDark: '#18895b',
  text: '#26432f',
  textSecondary: '#5a6d62',
  placeholder: '#9aa39a',
  border: '#d9e4df',
  inputBackground: '#f5f7f5',
  shadow: '#0000000f',
};

export const SIZES = {
  base: 16,
  small: 12,
  medium: 18,
  large: 24,
  radius: 20,
  cardRadius: 28,
  iconSize: 20,
};

export const FONTS = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  body: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
  },
  caption: {
    fontSize: 13,
    color: COLORS.placeholder,
  },
});
