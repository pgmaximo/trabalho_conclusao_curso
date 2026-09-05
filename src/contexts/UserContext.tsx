import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { getUserSession } from '@/services/auth/userSessionService';
import { getAvatarDisplayUrl } from '@/services/avatarService';

const client = generateClient<Schema>();

const USER_PROFILE_KEY = '@SuaSaude:userProfile';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  // DECISION: gender mapeado de sex ('Masculino'/'Feminino'/'Outro') para convenção interna em inglês
  gender: 'male' | 'female' | 'other' | undefined;
  birthDate?: string;
  weightKg?: number;
  heightCm?: number;
  isSmoker?: boolean;
  sexuallyActive?: boolean;
  physicalActivity?: boolean;
  alcoholConsumption?: boolean;
  pregnancy?: boolean;
  // DECISION: existência do registro no DynamoDB = onboarding completo (sem campo booleano separado)
  onboardingCompleted: boolean;
  // photoUrl é derivado (URL assinada, temporária) a partir de photoKey via
  // getAvatarDisplayUrl — nunca persistido, sempre resolvido no fetch.
  photoUrl?: string;
}

interface UserContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  clearUser: () => void;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  isLoading: true,
  refreshUser: async () => {},
  clearUser: () => {},
});

function mapGender(sex?: string | null): 'male' | 'female' | 'other' | undefined {
  if (sex === 'Masculino') return 'male';
  if (sex === 'Feminino') return 'female';
  if (sex === 'Outro') return 'other';
  return undefined;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchAndUpdateUser(): Promise<void> {
    try {
      const session = await getUserSession();
      if (!session) return;

      const { data: profiles } = await client.models.UserProfile.list({});
      const profile = profiles?.[0];

      // Resolve a URL assinada da foto sob demanda a partir da key persistida.
      // Falha de leitura (ex.: rede) nunca deve travar o carregamento do resto
      // do perfil — o avatar cai no fallback de iniciais/gênero nesse caso.
      let photoUrl: string | undefined;
      if (profile?.photoKey) {
        try {
          photoUrl = await getAvatarDisplayUrl(profile.photoKey);
        } catch {
          photoUrl = undefined;
        }
      }

      const userProfile: UserProfile = {
        id: session.userId,
        email: session.email,
        name: profile?.fullName ?? session.username,
        gender: mapGender(profile?.sex),
        birthDate: profile?.birthDate ?? undefined,
        weightKg: profile?.weightKg ?? undefined,
        heightCm: profile?.heightCm ?? undefined,
        isSmoker: profile?.isSmoker ?? undefined,
        sexuallyActive: profile?.sexuallyActive ?? undefined,
        physicalActivity: profile?.physicalActivity ?? undefined,
        alcoholConsumption: profile?.alcoholConsumption ?? undefined,
        pregnancy: profile?.pregnancy ?? undefined,
        onboardingCompleted: !!profile,
        photoUrl,
      };

      setUser(userProfile);
      AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile)).catch(() => {});
    } catch {
      // mantém estado atual silenciosamente em caso de erro de rede
    }
  }

  useEffect(() => {
    AsyncStorage.getItem(USER_PROFILE_KEY)
      .then((cached) => {
        if (cached) {
          setUser(JSON.parse(cached) as UserProfile);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
        fetchAndUpdateUser();
      });
  }, []);

  async function refreshUser(): Promise<void> {
    await fetchAndUpdateUser();
  }

  function clearUser(): void {
    setUser(null);
    AsyncStorage.removeItem(USER_PROFILE_KEY).catch(() => {});
  }

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  return useContext(UserContext);
}
