import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Copy, Trash2, Settings, Monitor, X } from 'lucide-react';
import { TerminalMessage } from '../types';
import { serialService } from '../services/serial';

interface SerialMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
}

export function SerialMonitor({ isOpen, onClose, isConnected }: SerialMonitorProps) {
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [isRawMode, setIsRawMode] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Set up message handler when modal opens
      serialService.setMessageHandler((message: TerminalMessage) => {
        setMessages(prev => [...prev, message]);
      });
      
      // Start monitoring if device is connected
      if (isConnected) {
        startMonitoring();
      }
    }
    
    return () => {
      // Clean up when modal closes
      if (!isOpen) {
        serialService.setMessageHandler(() => {});
      }
    };
  }, [isOpen, isConnected]);

  const startMonitoring = async () => {
    try {
      setIsMonitoring(true);
      await serialService.restartMonitoring();
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      setIsMonitoring(false);
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    // serialService will handle stopping monitoring
  };

  const clearLogs = () => {
    setMessages([]);
  };

  const copyLogs = () => {
    const logText = messages.map(msg => 
      `[${msg.timestamp.toLocaleTimeString()}] ${msg.message}`
    ).join('\n');
    navigator.clipboard.writeText(logText);
  };

  const downloadLogs = () => {
    const logText = messages.map(msg => 
      `[${msg.timestamp.toLocaleTimeString()}] ${msg.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esp32-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMessageColor = (type: TerminalMessage['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Serial Monitor
              {isConnected && (
                <Badge variant="outline" className="ml-2">
                  {isMonitoring ? 'Monitoring' : 'Connected'}
                </Badge>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRawMode(!isRawMode)}
              >
                <Settings className="h-4 w-4 mr-1" />
                {isRawMode ? 'Formatted' : 'Raw'}
              </Button>
              <Button variant="outline" size="sm" onClick={clearLogs}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={copyLogs}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={downloadLogs}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <Separator />

        <div className="flex-1 flex flex-col min-h-0">
          {!isConnected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No device connected</p>
                <p className="text-sm">Connect a device to view serial output</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4">
              <div className="font-mono text-sm space-y-1">
                {messages.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">
                    <p>Waiting for device output...</p>
                    <p className="text-xs mt-2">
                      {isMonitoring ? 'Monitoring active' : 'Click "Start Monitor" to begin'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div key={msg.id} className="flex gap-2 hover:bg-muted/50 px-2 py-1 rounded">
                      <span className="text-xs text-muted-foreground min-w-fit">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                      <span className={getMessageColor(msg.type)}>
                        {msg.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {isConnected && (
              <Button
                variant={isMonitoring ? "secondary" : "default"}
                size="sm"
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
              >
                <Monitor className="h-4 w-4 mr-1" />
                {isMonitoring ? 'Stop Monitor' : 'Start Monitor'}
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              {messages.length} messages
            </span>
          </div>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}