import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Button } from '@/components/Button';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type DocumentType = 'laudo' | 'receita';

const DOCUMENT_TYPES: Array<{ id: DocumentType; label: string }> = [
  { id: 'laudo', label: 'Laudo' },
  { id: 'receita', label: 'Receita' },
];

type UploadDocumentScreenProps = {
  onBack: () => void;
};

export function UploadDocumentScreen({ onBack }: UploadDocumentScreenProps) {
  const [documentType, setDocumentType] = useState<DocumentType>('laudo');
  const [documentName, setDocumentName] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleSelectFile = () => {
    Alert.alert(
      'Selecionar arquivo',
      'Adicionar suporte para upload de imagem ou PDF usando um picker nativo (por exemplo, expo-document-picker).'
    );
  };

  const handleSave = () => {
    if (!selectedFile) {
      Alert.alert('Atenção', 'Selecione uma imagem ou PDF antes de salvar.');
      return;
    }

    if (!documentName.trim() || !documentDate.trim()) {
      Alert.alert('Atenção', 'Preencha nome e data do documento.');
      return;
    }

    if (documentType === 'receita' && !expirationDate.trim()) {
      Alert.alert('Atenção', 'Preencha a data de validade para a receita.');
      return;
    }

    Alert.alert('Documento salvo', 'Seu documento foi registrado com sucesso.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Adicionar documento</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Tipo de documento</Text>
        <View style={styles.typeSelector}>
          {DOCUMENT_TYPES.map((option) => {
            const isActive = option.id === documentType;
            return (
              <Pressable
                key={option.id}
                style={[styles.typeOption, isActive && styles.typeOptionActive]}
                onPress={() => setDocumentType(option.id)}
              >
                <Text style={[styles.typeOptionText, isActive && styles.typeOptionTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Arquivo</Text>
        <Pressable style={styles.uploadCard} onPress={handleSelectFile}>
          <Text style={styles.uploadTitle}>Buscar imagem ou PDF</Text>
          <Text style={styles.uploadSubtitle}>{selectedFile ?? 'Nenhum arquivo selecionado'}</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Nome do documento</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Hemograma completo"
          placeholderTextColor={COLORS.placeholder}
          value={documentName}
          onChangeText={setDocumentName}
        />

        <Text style={styles.sectionTitle}>Data do documento</Text>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={COLORS.placeholder}
          value={documentDate}
          onChangeText={setDocumentDate}
        />

        {documentType === 'receita' && (
          <>
            <Text style={styles.sectionTitle}>Data de validade</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={COLORS.placeholder}
              value={expirationDate}
              onChangeText={setExpirationDate}
            />
          </>
        )}

        <View style={styles.buttonWrapper}>
          <Button title="Salvar documento" onPress={handleSave} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.medium,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginRight: SIZES.medium,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonPressed: {
    opacity: 0.75,
  },
  backButtonText: {
    fontSize: 20,
  },
  headerTitle: {
    ...FONTS.heading,
    fontSize: 22,
    color: COLORS.text,
  },
  content: {
    paddingHorizontal: SIZES.large,
    paddingBottom: SIZES.large * 2,
  },
  sectionTitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.small,
    marginTop: SIZES.large,
  },
  typeSelector: {
    flexDirection: 'row',
    marginHorizontal: -SIZES.small / 2,
  },
  typeOption: {
    flex: 1,
    paddingVertical: SIZES.base,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    marginHorizontal: SIZES.small / 2,
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeOptionText: {
    ...FONTS.button,
    color: COLORS.text,
  },
  typeOptionTextActive: {
    color: '#ffffff',
  },
  uploadCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.large,
    justifyContent: 'center',
  },
  uploadTitle: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.xSmall,
  },
  uploadSubtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.small,
    color: COLORS.text,
    ...FONTS.body,
  },
  buttonWrapper: {
    marginTop: SIZES.large,
  },
});
