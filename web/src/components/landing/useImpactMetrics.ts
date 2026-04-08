import { useQuery } from "@tanstack/react-query";

import { apiGetJson } from "@/lib/api";

export type PublicMetricDto = {
  displayValue: string;
};

export type PublicMoneyFlowDto = {
  programsPct: number;
  operationsPct: number;
  administrationPct: number;
};

const staleTime = 5 * 60 * 1000;
const refetchInterval = 60 * 1000;

export function useGirlsServedMetric() {
  return useQuery({
    queryKey: ["public-impact", "girls-served"],
    queryFn: () =>
      apiGetJson<PublicMetricDto>("/api/public/impact/girls-served", {
        cache: "no-store",
      }),
    staleTime,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval,
  });
}

export function useSafehousesMetric() {
  return useQuery({
    queryKey: ["public-impact", "safehouses"],
    queryFn: () =>
      apiGetJson<PublicMetricDto>("/api/public/impact/safehouses", {
        cache: "no-store",
      }),
    staleTime,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval,
  });
}

export function useReintegrationRateMetric() {
  return useQuery({
    queryKey: ["public-impact", "reintegration-rate"],
    queryFn: () =>
      apiGetJson<PublicMetricDto>("/api/public/impact/reintegration-rate", {
        cache: "no-store",
      }),
    staleTime,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval,
  });
}

export function useMoneyFlowMetric() {
  return useQuery({
    queryKey: ["public-impact", "money-flow"],
    queryFn: () =>
      apiGetJson<PublicMoneyFlowDto>("/api/public/impact/money-flow", {
        cache: "no-store",
      }),
    staleTime,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval,
  });
}
