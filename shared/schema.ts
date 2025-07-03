import { z } from "zod";

// Device mapping schema
export const deviceMappingSchema = z.object({
  id: z.string(),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, "Invalid MAC address format"),
  deviceFamily: z.enum(["air_quality_monitor", "co2_monitor", "sense360_v2"]),
  allowedVersions: z.array(z.enum(["stable", "beta"])),
  notes: z.string().optional(),
  createdAt: z.date().optional(),
});

export const insertDeviceMappingSchema = deviceMappingSchema.omit({ id: true, createdAt: true });

export type DeviceMapping = z.infer<typeof deviceMappingSchema>;
export type InsertDeviceMapping = z.infer<typeof insertDeviceMappingSchema>;

// Firmware schema
export const firmwareSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  family: z.string(),
  type: z.enum(["stable", "beta", "factory"]),
  downloadUrl: z.string().url(),
  size: z.number(),
  releaseDate: z.date(),
  description: z.string().optional(),
  tagName: z.string(),
});

export type Firmware = z.infer<typeof firmwareSchema>;

// Device info schema
export const deviceInfoSchema = z.object({
  chipType: z.string(),
  macAddress: z.string(),
  flashSize: z.string(),
  firmware: z.string().optional(),
});

export type DeviceInfo = z.infer<typeof deviceInfoSchema>;

// Flash progress schema
export const flashProgressSchema = z.object({
  stage: z.enum(["connecting", "erasing", "writing", "verifying", "complete", "error"]),
  progress: z.number().min(0).max(100),
  message: z.string(),
  timestamp: z.date(),
});

export type FlashProgress = z.infer<typeof flashProgressSchema>;
