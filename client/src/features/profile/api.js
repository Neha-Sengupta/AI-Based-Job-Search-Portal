import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const profileKeys = {
  all: ["profile"],
  detail: () => ["profile", "detail"],
};

// 404 = no profile yet (not an error for the UI): returns null.
export function useProfile(options = {}) {
  return useQuery({
    queryKey: profileKeys.detail(),
    queryFn: async () => {
      try {
        const res = await api.get("/profile");
        return res.data.data;
      } catch (error) {
        if (error.code === "NOT_FOUND") return null;
        throw error;
      }
    },
    ...options,
  });
}

function useProfileMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (data?.id) queryClient.setQueryData(profileKeys.detail(), data);
      return queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

export const useCreateProfile = () =>
  useProfileMutation((input) => api.post("/profile", input).then((res) => res.data.data));

export const useUpdateProfile = () =>
  useProfileMutation((input) => api.patch("/profile", input).then((res) => res.data.data));

const formDataWith = (file) => {
  const data = new FormData();
  data.append("file", file);
  return data;
};

export const useUploadPhoto = () =>
  useProfileMutation((file) =>
    api.post("/profile/photo", formDataWith(file)).then((res) => res.data.data),
  );

export const useDeletePhoto = () => useProfileMutation(() => api.delete("/profile/photo"));

// Returns { uploadedCvFileId, draft, warnings }; nothing is saved to the profile yet (F2.3).
export function useUploadCv() {
  return useMutation({
    mutationFn: (file) =>
      api.post("/profile/cv-upload", formDataWith(file)).then((res) => res.data.data),
  });
}
