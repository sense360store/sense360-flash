import { AlertTriangle, XCircle, Shield, AlertCircle, Info, CheckCircle, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function Troubleshooting() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <CardTitle>Troubleshooting</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-medium text-gray-900">Device Not Detected</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">If your device isn't showing up:</p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Try a different USB cable (data cable, not charging-only)</li>
              <li>• Hold the BOOT button while connecting USB</li>
              <li>• Check that you're using a supported browser (Chrome, Edge, Opera)</li>
              <li>• Install CP2102 or CH340 USB drivers if needed</li>
              <li>• Try a different USB port on your computer</li>
            </ul>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">Browser Permissions</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">Permission issues:</p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Allow USB device access when prompted by the browser</li>
              <li>• Enable "Experimental Web Platform Features" in Chrome flags</li>
              <li>• Use HTTPS or localhost for Web Serial API access</li>
              <li>• Clear browser cache and cookies if experiencing issues</li>
              <li>• Disable browser extensions that might interfere</li>
            </ul>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-medium text-gray-900">Flashing Errors</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">If flashing fails:</p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Hold BOOT button during the entire flashing process</li>
              <li>• Lower the flash speed in advanced options (if available)</li>
              <li>• Try erasing flash memory first before flashing</li>
              <li>• Ensure stable USB connection throughout the process</li>
              <li>• Close other applications that might use the serial port</li>
            </ul>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">Browser Compatibility</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">Supported browsers and versions:</p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Google Chrome 89+ (recommended)</li>
              <li>• Microsoft Edge 89+</li>
              <li>• Opera 75+</li>
              <li>• Chromium-based browsers with Web Serial API support</li>
              <li>• Note: Firefox and Safari are not currently supported</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Need More Help?</h3>
          </div>
          <p className="text-sm text-blue-700 mb-3">If you're still experiencing issues, try these additional resources:</p>
          <div className="space-y-2">
            <Button variant="link" className="h-auto p-0 text-blue-700 hover:text-blue-800">
              <span className="text-sm">View detailed documentation</span>
            </Button>
            <Button variant="link" className="h-auto p-0 text-blue-700 hover:text-blue-800">
              <span className="text-sm">Visit support forum</span>
            </Button>
            <Button variant="link" className="h-auto p-0 text-blue-700 hover:text-blue-800">
              <span className="text-sm">Report an issue on GitHub</span>
            </Button>
          </div>
        </div>
        
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Quick Checklist:</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Ensure you have a data USB cable, supported browser, device in bootloader mode, and necessary permissions granted.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
