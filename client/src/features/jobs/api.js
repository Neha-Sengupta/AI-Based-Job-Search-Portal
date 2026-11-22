import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const jobKeys = {
  all: ["jobs"],
  list: (params) => ["jobs", "list", params],
  recommended: (params) => ["jobs", "recommended", params],
  detail: (id) => ["jobs", "detail", id],
};

// URLSearchParams keeps repeatable filters (workModel=remote&workModel=hybrid) as repeated keys.
const toQuery = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of [].concat(value))
      if (item !== undefined && item !== "") search.append(key, item);
  }
  return search;
};

export function useJobs(params) {
  return useQuery({
    queryKey: jobKeys.list(params),
    queryFn: () => api.get("/jobs", { params: toQuery(params) }).then((res) => res.data),
    placeholderData: keepPreviousData,
  });
}

export function useRecommendedJobs(params = { limit: 10 }, options = {}) {
  return useQuery({
    queryKey: jobKeys.recommended(params),
    queryFn: () => api.get("/jobs/recommended", { params }).then((res) => res.data),
    ...options,
  });
}

export function useJob(id) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => api.get(`/jobs/${id}`).then((res) => res.data.data),
    retry: (count, error) => error?.status >= 500 && count < 2,
  });
}
