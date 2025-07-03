import { CheckCircle, Github, ExternalLink, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeviceInfo } from '../types';

interface SidebarProps {
  deviceInfo?: DeviceInfo;
  showDeviceInfo: boolean;
}

export function Sidebar({ deviceInfo, showDeviceInfo }: SidebarProps) {
  return (
    <div className="space-y-6">
      {/* Connection Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connection Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <div className="font-medium">Chrome, Edge, or Opera browser</div>
                <div className="text-gray-500">Web Serial API support required</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <div className="font-medium">USB cable connected to device</div>
                <div className="text-gray-500">Data cable, not charging-only</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <div className="font-medium">Device in bootloader mode</div>
                <div className="text-gray-500">Hold BOOT button while connecting</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Information */}
      {showDeviceInfo && deviceInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Device Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Chip Type:</span>
                <span className="text-sm font-medium text-gray-900">{deviceInfo.chipType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">MAC Address:</span>
                <span className="text-sm font-medium text-gray-900 font-mono">{deviceInfo.macAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Flash Size:</span>
                <span className="text-sm font-medium text-gray-900">{deviceInfo.flashSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Firmware:</span>
                <span className="text-sm font-medium text-gray-900">{deviceInfo.firmware || 'Unknown'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Repository:</span>
              <Button variant="link" size="sm" className="h-auto p-0" asChild>
                <a href="https://github.com/sense360store/sense360-flash" target="_blank" className="text-sense360-blue hover:text-indigo-800">
                  GitHub
                </a>
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Documentation:</span>
              <Button variant="link" size="sm" className="h-auto p-0">
                <span className="text-sense360-blue hover:text-indigo-800">Docs</span>
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Support:</span>
              <Button variant="link" size="sm" className="h-auto p-0">
                <span className="text-sense360-blue hover:text-indigo-800">Forum</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
