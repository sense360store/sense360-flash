import { useState } from 'react';
import { X, Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DeviceMapping } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [deviceMappings, setDeviceMappings] = useState<DeviceMapping[]>([
    {
      id: '1',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      deviceFamily: 'air_quality_monitor',
      allowedVersions: ['stable', 'beta'],
      notes: 'Production device',
    },
    {
      id: '2',
      macAddress: '11:22:33:44:55:66',
      deviceFamily: 'sense360_v2',
      allowedVersions: ['beta'],
      notes: 'Test device',
    },
  ]);

  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [newDevice, setNewDevice] = useState<Partial<DeviceMapping>>({
    macAddress: '',
    deviceFamily: '',
    allowedVersions: [],
    notes: '',
  });

  const handleAddDevice = () => {
    if (newDevice.macAddress && newDevice.deviceFamily && newDevice.allowedVersions) {
      const device: DeviceMapping = {
        id: Date.now().toString(),
        macAddress: newDevice.macAddress,
        deviceFamily: newDevice.deviceFamily,
        allowedVersions: newDevice.allowedVersions,
        notes: newDevice.notes || '',
      };
      setDeviceMappings([...deviceMappings, device]);
      setNewDevice({
        macAddress: '',
        deviceFamily: '',
        allowedVersions: [],
        notes: '',
      });
      setIsAddingDevice(false);
    }
  };

  const handleDeleteDevice = (id: string) => {
    setDeviceMappings(deviceMappings.filter(device => device.id !== id));
  };

  const getFamilyDisplayName = (family: string): string => {
    const familyNames: Record<string, string> = {
      'air_quality_monitor': 'Air Quality Monitor',
      'co2_monitor': 'CO2 Monitor',
      'sense360_v2': 'Sense360 V2',
    };
    return familyNames[family] || family;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50">
      <div className="h-full flex flex-col">
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Admin Panel - Device Management</h1>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-300 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Device Mapping Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Device MAC Address Mapping</CardTitle>
                  <Dialog open={isAddingDevice} onOpenChange={setIsAddingDevice}>
                    <DialogTrigger asChild>
                      <Button className="bg-sense360-blue hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Device
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Device</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="mac-address">MAC Address</Label>
                          <Input
                            id="mac-address"
                            value={newDevice.macAddress}
                            onChange={(e) => setNewDevice({...newDevice, macAddress: e.target.value})}
                            placeholder="AA:BB:CC:DD:EE:FF"
                          />
                        </div>
                        <div>
                          <Label htmlFor="device-family">Device Family</Label>
                          <Select value={newDevice.deviceFamily} onValueChange={(value) => setNewDevice({...newDevice, deviceFamily: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select device family" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="air_quality_monitor">Air Quality Monitor</SelectItem>
                              <SelectItem value="co2_monitor">CO2 Monitor</SelectItem>
                              <SelectItem value="sense360_v2">Sense360 V2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="allowed-versions">Allowed Versions</Label>
                          <div className="flex space-x-2 mt-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={newDevice.allowedVersions?.includes('stable')}
                                onChange={(e) => {
                                  const versions = newDevice.allowedVersions || [];
                                  if (e.target.checked) {
                                    setNewDevice({...newDevice, allowedVersions: [...versions, 'stable']});
                                  } else {
                                    setNewDevice({...newDevice, allowedVersions: versions.filter(v => v !== 'stable')});
                                  }
                                }}
                                className="mr-2"
                              />
                              Stable
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={newDevice.allowedVersions?.includes('beta')}
                                onChange={(e) => {
                                  const versions = newDevice.allowedVersions || [];
                                  if (e.target.checked) {
                                    setNewDevice({...newDevice, allowedVersions: [...versions, 'beta']});
                                  } else {
                                    setNewDevice({...newDevice, allowedVersions: versions.filter(v => v !== 'beta')});
                                  }
                                }}
                                className="mr-2"
                              />
                              Beta
                            </label>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="notes">Notes</Label>
                          <Input
                            id="notes"
                            value={newDevice.notes}
                            onChange={(e) => setNewDevice({...newDevice, notes: e.target.value})}
                            placeholder="Optional notes"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={handleAddDevice} className="flex-1">
                            Add Device
                          </Button>
                          <Button variant="outline" onClick={() => setIsAddingDevice(false)} className="flex-1">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">MAC Address</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Device Family</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Allowed Versions</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Notes</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceMappings.map((device) => (
                        <tr key={device.id} className="border-b border-gray-100">
                          <td className="py-3 px-4 font-mono text-sm">{device.macAddress}</td>
                          <td className="py-3 px-4 text-sm">{getFamilyDisplayName(device.deviceFamily)}</td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex space-x-1">
                              {device.allowedVersions.map((version) => (
                                <Badge key={version} variant="secondary" className="text-xs">
                                  {version}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{device.notes}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-600 hover:text-red-800"
                                onClick={() => handleDeleteDevice(device.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* Firmware Management Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Firmware Management</CardTitle>
                  <Button variant="outline" className="bg-gray-600 hover:bg-gray-700 text-white">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh from GitHub
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">Air Quality Monitor</h3>
                      <span className="text-sm text-gray-500">3 versions</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Latest: v1.0.0 (Stable)</div>
                      <div>Beta: v1.1.0-beta</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">CO2 Monitor</h3>
                      <span className="text-sm text-gray-500">2 versions</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Latest: v1.2.0 (Stable)</div>
                      <div>Beta: None</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">Sense360 V2</h3>
                      <span className="text-sm text-gray-500">1 version</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Latest: v2.0.0 (Beta)</div>
                      <div>Stable: None</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* System Status Section */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">GitHub API Status</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Rate Limit:</span>
                        <span className="text-sm font-medium text-green-600">4850/5000</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Last Sync:</span>
                        <span className="text-sm font-medium text-gray-900">2 minutes ago</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Repository:</span>
                        <span className="text-sm font-medium text-green-600">Connected</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Flash Statistics</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Today:</span>
                        <span className="text-sm font-medium text-gray-900">23 flashes</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">This Week:</span>
                        <span className="text-sm font-medium text-gray-900">156 flashes</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Success Rate:</span>
                        <span className="text-sm font-medium text-green-600">98.7%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
