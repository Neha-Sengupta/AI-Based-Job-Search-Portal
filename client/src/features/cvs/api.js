import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { downloadFile } from "@/lib/download";

export const cvKeys = {
  all: ["cvs"],
  list: (params) => ["cvs", "list", params],
  detail: (id) => ["cvs", "detail", id],
};

export function useCvs(params = { limit: 50 }) {
  return useQuery({
    queryKey: cvKeys.list(params),
    queryFn: () => api.get("/cvs", { params }).then((res) => res.data),
  });
}

export function useCv(id) {
  return useQuery({
    queryKey: cvKeys.detail(id),
    queryFn: () => api.get(`/cvs/${id}`).then((res) => res.data.data),
    enabled: Boolean(id),
  });
}

// Tailoring and preview don't change server data, so they're plain mutations without invalidation.
export const useTailorCv = () =>
  useMutation({
    mutationFn: (input) => api.post("/cvs/tailor", input).then((res) => res.data.data),
  });

export const usePreviewCv = () =>
  useMutation({
    mutationFn: (input) => api.post("/cvs/preview", input).then((res) => res.data.data.html),
  });

function useCvMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cvKeys.all }),
  });
}

export const useCreateCv = () =>
  useCvMutation((input) => api.post("/cvs", input).then((res) => res.data.data));
export const useUpdateCv = () =>
  useCvMutation(({ id, ...input }) => api.patch(`/cvs/${id}`, input).then((res) => res.data.data));
export const useDeleteCv = () => useCvMutation((id) => api.delete(`/cvs/${id}`));

export const downloadCv = (cv) => downloadFile(`/cvs/${cv.id}/download`, `${cv.title}.pdf`);
