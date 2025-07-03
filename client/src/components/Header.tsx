import { useState } from 'react';
import { Settings, Github, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onAdminClick: () => void;
}

export function Header({ onAdminClick }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sense360-blue rounded-lg flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Sense360 Flash</h1>
              <p className="text-sm text-gray-500">ESP32 Firmware Flashing Tool</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onAdminClick}
              className="text-gray-400 hover:text-gray-600"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-gray-400 hover:text-gray-600"
            >
              <a href="https://github.com/sense360store/sense360-flash" target="_blank">
                <Github className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
