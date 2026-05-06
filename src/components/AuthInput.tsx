import React from 'react';
import { StyleProp, TextInputProps, ViewStyle } from 'react-native';

import { FormField } from '@/components/FormField';

type AuthInputProps = TextInputProps & {
  label: string;
  icon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AuthInput({ label, icon, containerStyle, style, ...rest }: AuthInputProps) {
  return <FormField label={label} icon={icon} containerStyle={containerStyle} style={style} {...rest} />;
}
