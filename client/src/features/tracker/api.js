import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { jobKeys } from "@/features/jobs/api";

export const applicationKeys = {
  all: ["applications"],
  list: (params) => ["applications", "list", params],
  usage: () => ["usage"],
};

export function useApplications(params = { limit: 50 }) {
  return useQuery({
    queryKey: applicationKeys.list(params),
    queryFn: () => api.get("/applications", { params }).then((res) => res.data),
  });
}

function useApplicationMutation(mutationFn, extraKeys = []) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all(
        [applicationKeys.all, jobKeys.all, ...extraKeys].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

export const useCreateApplication = () =>
  useApplicationMutation((input) => api.post("/applications", input).then((res) => res.data.data));

export const useUpdateApplication = () =>
  useApplicationMutation(({ id, ...input }) =>
    api.patch(`/applications/${id}`, input).then((res) => res.data.data),
  );

export const useDeleteApplication = () =>
  useApplicationMutation((id) => api.delete(`/applications/${id}`));

export const useDraftAnswers = () =>
  useApplicationMutation(
    ({ id, ...input }) =>
      api.post(`/applications/${id}/answers`, input).then((res) => res.data.data),
    [applicationKeys.usage()],
  );

export function useApplication(id) {
  return useQuery({
    queryKey: ["applications", "detail", id],
    queryFn: () => api.get(`/applications/${id}`).then((res) => res.data.data),
    enabled: Boolean(id),
  });
}

export function useUsage() {
  return useQuery({
    queryKey: applicationKeys.usage(),
    queryFn: () => api.get("/usage").then((res) => res.data.data),
  });
}
