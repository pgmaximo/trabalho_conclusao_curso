import React from 'react';
import { TextInputProps } from 'react-native';

import { FormField } from '@/components/FormField';

type AuthInputProps = TextInputProps & {
  label: string;
  icon?: string;
};

export function AuthInput({ label, icon, style, ...rest }: AuthInputProps) {
  return <FormField label={label} icon={icon} style={style} {...rest} />;
}
