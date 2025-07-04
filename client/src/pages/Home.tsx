import { useState } from 'react';
import { Header } from '../components/Header';
import { DeviceConnection } from '../components/DeviceConnection';
import { FirmwareSelection } from '../components/FirmwareSelection';
import { FlashingProcess } from '../components/FlashingProcess';
import { Sidebar } from '../components/Sidebar';
import { Troubleshooting } from '../components/Troubleshooting';
import { AdminPanel } from '../components/AdminPanel';
import { useDeviceConnection } from '../hooks/useDeviceConnection';
import { ParsedFirmware } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Wifi } from 'lucide-react';

export function Home() {
  const { isConnected, device } = useDeviceConnection();
  const [selectedFirmware, setSelectedFirmware] = useState<ParsedFirmware | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAfterFlashing, setShowAfterFlashing] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      setShowAdminModal(false);
      setShowAdminPanel(true);
      setAdminPassword('');
    } else {
      alert('Invalid password');
    }
  };

  const handleFlashComplete = () => {
    setShowAfterFlashing(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAdminClick={() => setShowAdminModal(true)} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <DeviceConnection />
            <FirmwareSelection 
              selectedFirmware={selectedFirmware}
              onSelectFirmware={setSelectedFirmware}
            />
            <FlashingProcess 
              isDeviceConnected={isConnected}
              selectedFirmware={selectedFirmware}
              onFlashComplete={handleFlashComplete}
            />
            
            {/* After Flashing Section */}
            {showAfterFlashing && (
              <Card>
                <CardHeader>
                  <CardTitle>After Flashing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Wifi className="w-5 h-5 text-sense360-blue mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-2">Wi-Fi Setup</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>1.</strong> Device will reboot and create a Wi-Fi hotspot named "Sense360-XXXXXX"</p>
                          <p><strong>2.</strong> Connect your phone or computer to this hotspot</p>
                          <p><strong>3.</strong> Browser will automatically open the configuration page</p>
                          <p><strong>4.</strong> Enter your home Wi-Fi credentials to complete setup</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Setup Complete!</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">Your Sense360 device is now ready to use.</p>
                      
                      <div className="mt-4 space-y-2">
                        <h4 className="font-medium text-green-900">Next steps:</h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          <li>• Configure device settings</li>
                          <li>• Set up automation rules</li>
                          <li>• Monitor sensor data</li>
                          <li>• Enable OTA updates</li>
                        </ul>
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <strong>Tip:</strong> If the captive portal doesn't open automatically, navigate to{' '}
                          <span className="font-mono bg-blue-100 px-1 rounded">192.168.4.1</span> in your browser.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Troubleshooting />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Sidebar deviceInfo={device} showDeviceInfo={isConnected} />
          </div>
        </div>
      </div>

      {/* Admin Modal */}
      <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Admin Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
            </div>
            <div className="flex space-x-3">
              <Button onClick={handleAdminLogin} className="flex-1 bg-sense360-blue hover:bg-indigo-700">
                Access Admin
              </Button>
              <Button variant="outline" onClick={() => setShowAdminModal(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Panel */}
      <AdminPanel isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
    </div>
  );
}
