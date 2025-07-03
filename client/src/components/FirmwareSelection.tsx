import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useGitHubReleases } from '../hooks/useGitHubReleases';
import { githubService } from '../services/github';
import { ParsedFirmware } from '../types';
import { format } from 'date-fns';

interface FirmwareSelectionProps {
  selectedFirmware: ParsedFirmware | null;
  onSelectFirmware: (firmware: ParsedFirmware) => void;
}

export function FirmwareSelection({ selectedFirmware, onSelectFirmware }: FirmwareSelectionProps) {
  const [familyFilter, setFamilyFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  
  const { releases, isLoading, error, getFamilies, getTypes, getFilteredFirmware } = useGitHubReleases();

  const families = getFamilies();
  const types = getTypes();
  const filteredFirmware = getFilteredFirmware(
    familyFilter === 'all' ? undefined : familyFilter || undefined, 
    typeFilter === 'all' ? undefined : typeFilter || undefined
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Firmware Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sense360-blue"></div>
            <span className="ml-3 text-gray-600">Loading firmware versions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Firmware Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              Failed to load firmware versions from GitHub. Please check your internet connection and try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firmware Selection</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="family-filter" className="text-sm font-medium text-gray-700 mb-2">
              Device Family
            </Label>
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Families" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Families</SelectItem>
                {families.map(family => (
                  <SelectItem key={family} value={family}>
                    {githubService.getFamilyDisplayName(family)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="type-filter" className="text-sm font-medium text-gray-700 mb-2">
              Release Type
            </Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type} value={type}>
                    {githubService.getTypeDisplayName(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <RadioGroup
          value={selectedFirmware?.id || ''}
          onValueChange={(value) => {
            const firmware = filteredFirmware.find(fw => fw.id === value);
            if (firmware) {
              onSelectFirmware(firmware);
            }
          }}
          className="space-y-3"
        >
          {filteredFirmware.map(firmware => (
            <div
              key={firmware.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value={firmware.id} id={firmware.id} />
                  <div>
                    <Label htmlFor={firmware.id} className="font-medium text-gray-900 cursor-pointer">
                      {githubService.getFamilyDisplayName(firmware.family)} {firmware.version}
                    </Label>
                    <p className="text-sm text-gray-500">
                      Released: {format(firmware.releaseDate, 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={githubService.getTypeBadgeColor(firmware.type)}>
                    {githubService.getTypeDisplayName(firmware.type)}
                  </Badge>
                </div>
              </div>
              {firmware.description && (
                <p className="text-sm text-gray-600 mt-2 ml-7">
                  {firmware.description.split('\n')[0]}
                </p>
              )}
            </div>
          ))}
        </RadioGroup>

        {selectedFirmware && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Firmware Details</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Name:</strong> {selectedFirmware.name}</p>
              <p><strong>Version:</strong> {selectedFirmware.version}</p>
              <p><strong>Family:</strong> {githubService.getFamilyDisplayName(selectedFirmware.family)}</p>
              <p><strong>Type:</strong> {githubService.getTypeDisplayName(selectedFirmware.type)}</p>
              <p><strong>Size:</strong> {Math.round(selectedFirmware.size / 1024)} KB</p>
              <p><strong>Release Date:</strong> {format(selectedFirmware.releaseDate, 'MMM dd, yyyy')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
