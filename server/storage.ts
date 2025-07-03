import { DeviceMapping, type InsertDeviceMapping } from "@shared/schema";

// Storage interface for ESP32 Flash Tool
export interface IStorage {
  getDeviceMapping(id: string): Promise<DeviceMapping | undefined>;
  getDeviceMappingByMac(macAddress: string): Promise<DeviceMapping | undefined>;
  createDeviceMapping(mapping: InsertDeviceMapping): Promise<DeviceMapping>;
  updateDeviceMapping(id: string, mapping: Partial<DeviceMapping>): Promise<DeviceMapping | undefined>;
  deleteDeviceMapping(id: string): Promise<boolean>;
  getAllDeviceMappings(): Promise<DeviceMapping[]>;
}

export class MemStorage implements IStorage {
  private deviceMappings: Map<string, DeviceMapping>;
  private currentId: number;

  constructor() {
    this.deviceMappings = new Map();
    this.currentId = 1;
  }

  async getDeviceMapping(id: string): Promise<DeviceMapping | undefined> {
    return this.deviceMappings.get(id);
  }

  async getDeviceMappingByMac(macAddress: string): Promise<DeviceMapping | undefined> {
    for (const mapping of Array.from(this.deviceMappings.values())) {
      if (mapping.macAddress === macAddress) {
        return mapping;
      }
    }
    return undefined;
  }

  async createDeviceMapping(insertMapping: InsertDeviceMapping): Promise<DeviceMapping> {
    const id = this.currentId.toString();
    this.currentId++;
    const mapping: DeviceMapping = { 
      ...insertMapping, 
      id,
      createdAt: new Date()
    };
    this.deviceMappings.set(id, mapping);
    return mapping;
  }

  async updateDeviceMapping(id: string, updates: Partial<DeviceMapping>): Promise<DeviceMapping | undefined> {
    const existing = this.deviceMappings.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.deviceMappings.set(id, updated);
    return updated;
  }

  async deleteDeviceMapping(id: string): Promise<boolean> {
    return this.deviceMappings.delete(id);
  }

  async getAllDeviceMappings(): Promise<DeviceMapping[]> {
    return Array.from(this.deviceMappings.values());
  }
}

export const storage = new MemStorage();