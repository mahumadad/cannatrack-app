import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { queryKeys } from '../utils/queryKeys';
import type {
  Protocol,
  Baseline,
  DoseLog,
  Checkin,
  FollowUpInfo,
  FollowUp,
  Receta,
  Solicitud,
  ShopifyCustomerProfile,
  ShopifyStoreData,
  ProductCatalog,
  Quote,
} from '../types';

// ─── Query Hooks ────────────────────────────────────────────────

export function useProtocol(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.protocol(userId!),
    queryFn: () => api.get(`/api/protocol/${userId}`) as Promise<Protocol>,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 min — rarely changes
  });
}

export function useBaseline(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.baseline(userId!),
    queryFn: () => api.get(`/api/baseline/${userId}`) as Promise<Baseline | null>,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDoses(userId: string | undefined, days = 60) {
  return useQuery({
    queryKey: queryKeys.doses(userId!, days),
    queryFn: () => api.get(`/api/doses/${userId}?days=${days}`) as Promise<DoseLog[]>,
    enabled: !!userId,
  });
}

export function useCheckins(userId: string | undefined, days = 30) {
  return useQuery({
    queryKey: queryKeys.checkins(userId!, days),
    queryFn: () => api.get(`/api/checkins/${userId}?days=${days}`) as Promise<Checkin[]>,
    enabled: !!userId,
  });
}

export function useFollowUpCurrent(userId: string | undefined, monthYear?: string) {
  return useQuery({
    queryKey: queryKeys.followUpCurrent(userId!, monthYear),
    queryFn: () => {
      const params = monthYear ? `?month_year=${monthYear}` : '';
      return api.get(`/api/followups/current/${userId}${params}`) as Promise<FollowUpInfo>;
    },
    enabled: !!userId,
  });
}

export function useFollowUpsCompleted(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.followUpsCompleted(userId!),
    queryFn: () => api.get(`/api/followups/completed/${userId}`) as Promise<Record<string, unknown>[]>,
    enabled: !!userId,
  });
}

export function useRecetasQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.recetas(userId!),
    queryFn: () => api.get(`/api/recetas/${userId}`) as Promise<Receta[]>,
    enabled: !!userId,
  });
}

export function useSolicitudes(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.solicitudes(userId!),
    queryFn: () => api.get(`/api/solicitudes/${userId}`) as Promise<Solicitud[]>,
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 min — admin can change status
  });
}

export function useSolicitudDetail(userId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.solicitudDetail(userId!, id!),
    queryFn: () => api.get(`/api/solicitudes/${userId}/${id}`) as Promise<Solicitud>,
    enabled: !!userId && !!id,
    staleTime: 60 * 1000,
  });
}

export function useShopifyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shopifyProfile(userId!),
    queryFn: () => api.get(`/api/shopify/profile/${userId}`, { skipAuthRedirect: true }) as Promise<ShopifyCustomerProfile | null>,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStoreData(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.storeData(userId!),
    queryFn: () => api.get(`/api/shopify/store/${userId}`, { skipAuthRedirect: true }) as Promise<ShopifyStoreData>,
    enabled: !!userId,
  });
}

export function useCatalog() {
  return useQuery({
    queryKey: queryKeys.catalog(),
    queryFn: () => api.get('/api/catalog/products') as Promise<ProductCatalog>,
    staleTime: 30 * 60 * 1000, // 30 min — almost static
  });
}

export function useRandomQuote() {
  return useQuery({
    queryKey: queryKeys.randomQuote(),
    queryFn: () => api.get('/api/quotes/random') as Promise<Quote>,
    staleTime: 0, // always fresh
  });
}

export function useHasPassword() {
  return useQuery({
    queryKey: queryKeys.hasPassword(),
    queryFn: () => api.get('/api/auth/has-password') as Promise<{ hasPassword: boolean }>,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserRecord(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.userRecord(userId!),
    queryFn: () => api.get(`/api/users/${userId}`) as Promise<Record<string, unknown>>,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Mutation Hooks ─────────────────────────────────────────────

export function useAddDose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/doses', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doses'] });
    },
  });
}

export function useDeleteDose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doseId: string) => api.delete(`/api/doses/${doseId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doses'] });
    },
  });
}

export function useCreateCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/checkins', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkins'] });
    },
  });
}

export function useUpdateCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put(`/api/checkins/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkins'] });
    },
  });
}

export function useDeleteCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (checkinId: string) => api.delete(`/api/checkins/${checkinId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkins'] });
    },
  });
}

export function useSaveProtocol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/protocol', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['protocol'] });
    },
  });
}

export function useDeleteProtocol(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/api/protocol/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['protocol'] });
    },
  });
}

export function useSaveBaseline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/baseline', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baseline'] });
    },
  });
}

export function useSubmitFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/followups', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['followup-current'] });
      qc.invalidateQueries({ queryKey: ['followups-completed'] });
    },
  });
}

export function useCreateSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/solicitudes', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes'] });
      qc.invalidateQueries({ queryKey: ['recetas'] });
    },
  });
}

export function useCancelSolicitud(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (solId: string) => api.put(`/api/solicitudes/${userId}/${solId}/cancelar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes'] });
      qc.invalidateQueries({ queryKey: ['solicitud'] });
    },
  });
}

export function useUploadReceta(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post(`/api/recetas/${userId}/upload`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recetas'] });
    },
  });
}

export function useUpdateShopifyName(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { firstName: string; lastName: string }) => api.put(`/api/shopify/profile/${userId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shopify-profile'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api.post('/api/auth/change-password', body),
  });
}

export function useCreatePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { password: string }) => api.post('/api/auth/create-password', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['has-password'] });
    },
  });
}

export function useMarkOnboarding(userId: string | undefined) {
  return useMutation({
    mutationFn: () => api.put(`/api/users/${userId}/onboarding`, { onboarding_completed: true }),
  });
}

export function useMembershipSubscribe() {
  return useMutation({
    mutationFn: (gateway: string = 'mercadopago') => api.post('/api/membership/subscribe', { gateway }),
  });
}

export function useCancelMembership() {
  return useMutation({
    mutationFn: () => api.post('/api/membership/cancel', {}),
  });
}
