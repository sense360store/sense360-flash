import { useQuery } from '@tanstack/react-query';
import { githubService } from '../services/github';
import { ParsedFirmware } from '../types';

export function useGitHubReleases() {
  const {
    data: releases,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['github-releases'],
    queryFn: async () => {
      const releases = await githubService.getReleases();
      return githubService.parseFirmwareFromReleases(releases);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const getFirmwareByFamily = (family?: string): ParsedFirmware[] => {
    if (!releases) return [];
    if (!family) return releases;
    return releases.filter(fw => fw.family === family);
  };

  const getFirmwareByType = (type?: string): ParsedFirmware[] => {
    if (!releases) return [];
    if (!type) return releases;
    return releases.filter(fw => fw.type === type);
  };

  const getFilteredFirmware = (family?: string, type?: string): ParsedFirmware[] => {
    if (!releases) return [];
    
    let filtered = releases;
    
    if (family) {
      filtered = filtered.filter(fw => fw.family === family);
    }
    
    if (type) {
      filtered = filtered.filter(fw => fw.type === type);
    }
    
    return filtered;
  };

  const getFamilies = (): string[] => {
    if (!releases) return [];
    return [...new Set(releases.map(fw => fw.family))];
  };

  const getTypes = (): string[] => {
    if (!releases) return [];
    return [...new Set(releases.map(fw => fw.type))];
  };

  return {
    releases: releases || [],
    isLoading,
    error,
    refetch,
    getFirmwareByFamily,
    getFirmwareByType,
    getFilteredFirmware,
    getFamilies,
    getTypes,
  };
}
