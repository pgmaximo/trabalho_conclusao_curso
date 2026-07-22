import React from 'react';
import { Image, Text, View } from 'react-native';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';

const boyImage = require('../../assets/images/boy_image.png');
const femImage = require('../../assets/images/fem_image.png');

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = {
  name?: string;
  gender?: 'male' | 'female' | undefined;
  photoUrl?: string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
};

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
};

// DECISION: dimensões numéricas explícitas garantem o tamanho do Image mesmo
// quando o NativeWind não aplica width/height da className, evitando que o PNG
// local renderize no seu tamanho intrínseco (imagem gigante).
const SIZE_PX: Record<AvatarSize, number> = {
  sm: 40,
  md: 64,
  lg: 96,
};

const TEXT_CLASS: Record<AvatarSize, string> = {
  sm: 'text-base',
  md: 'text-2xl',
  lg: 'text-4xl',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getGenderSource(gender?: 'male' | 'female') {
  if (gender === 'male') return boyImage;
  if (gender === 'female') return femImage;
  return null;
}

// DECISION: ordem de prioridade photoUrl > gênero > iniciais garante que o
// upload futuro de foto não quebre o sistema atual de avatar por gênero
export function Avatar({ name, gender, photoUrl, size = 'md', style }: AvatarProps) {
  const sizeClass = SIZE_CLASS[size];
  const textClass = TEXT_CLASS[size];
  const sizePx = SIZE_PX[size];
  const imageSizeStyle: ImageStyle = {
    width: sizePx,
    height: sizePx,
    borderRadius: sizePx / 2,
  };

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        className={`${sizeClass} rounded-full`}
        resizeMode="cover"
        style={[imageSizeStyle, style as StyleProp<ImageStyle>]}
      />
    );
  }

  const genderSource = getGenderSource(gender);
  if (genderSource) {
    return (
      <Image
        source={genderSource}
        className={`${sizeClass} rounded-full`}
        resizeMode="cover"
        style={[imageSizeStyle, style as StyleProp<ImageStyle>]}
      />
    );
  }

  return (
    <View
      className={`${sizeClass} items-center justify-center rounded-full bg-app-primarySoft dark:bg-app-dark-primarySoft`}
      style={style}
    >
      <Text className={`${textClass} font-bold text-app-primary dark:text-app-dark-primary`}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
