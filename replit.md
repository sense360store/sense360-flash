# Sense360 Flash - ESP32 Firmware Flashing Tool

## Overview

Sense360 Flash is a modern, browser-based ESP32 firmware flashing tool designed for Sense360 IoT devices. The application provides a streamlined interface for flashing firmware directly from a web browser using the Web Serial API, with firmware management handled through GitHub Releases.

## System Architecture

### Frontend Architecture
- **React 18 + TypeScript**: Modern React application with strict typing
- **Tailwind CSS + shadcn/ui**: Responsive design system with pre-built components
- **Vite**: Fast build tool with development server and hot module replacement
- **React Router (Wouter)**: Lightweight client-side routing
- **TanStack Query**: Data fetching and caching for GitHub API integration

### Backend Architecture
- **Express.js**: Node.js server for development and API endpoints
- **Static File Serving**: Production build served as static files
- **GitHub Pages Ready**: Designed for deployment to GitHub Pages

### Key Components

1. **Device Connection Management**
   - Web Serial API integration for ESP32 communication
   - Support for multiple USB-to-serial chips (CP2102, CH340, FTDI)
   - Real-time device detection and connection status

2. **Firmware Management**
   - GitHub Releases API integration for firmware discovery
   - Automatic firmware parsing and categorization
   - Support for multiple device families (air_quality_monitor, co2_monitor, sense360_v2)
   - Version management (stable, beta, factory)

3. **Admin Panel**
   - Device MAC address mapping and management
   - Firmware version restrictions per device
   - Password-protected access (admin123 for development)

4. **Flashing Process**
   - Real-time progress tracking
   - Error handling and recovery
   - Terminal output for debugging

## Data Flow

1. **Firmware Discovery**: Application fetches releases from GitHub API
2. **Device Connection**: User connects ESP32 via USB, browser requests serial port access
3. **Firmware Selection**: User selects appropriate firmware based on device type and version
4. **Flashing Process**: Application downloads firmware and flashes to device via Web Serial API
5. **Progress Monitoring**: Real-time updates on flashing progress and completion status

## External Dependencies

### GitHub Integration
- **GitHub API**: Fetches releases and firmware assets
- **GitHub Pages**: Hosts the production application
- **Repository**: `sense360store/sense360-flash`

### Browser APIs
- **Web Serial API**: Required for ESP32 communication
- **Modern Browser Support**: Chrome, Edge, Opera (Web Serial API requirement)

### Development Dependencies
- **Node.js**: Runtime for development server
- **TypeScript**: Type checking and compilation
- **ESBuild**: Production build bundling

## Deployment Strategy

### Development Environment
- Vite development server with hot module replacement
- Express.js backend for API routes and middleware
- Local development with full debugging capabilities

### Production Environment
- Static site generation optimized for GitHub Pages
- All assets bundled and optimized
- Client-side routing with fallback handling
- CDN delivery through GitHub Pages infrastructure

### Build Process
1. **Frontend Build**: Vite builds React application to `dist/public`
2. **Backend Build**: ESBuild bundles Express server to `dist/index.js`
3. **Static Deployment**: Frontend assets deployed to GitHub Pages
4. **API Integration**: Direct GitHub API calls from client (no backend required for production)

## Deployment

### GitHub Pages Configuration
- **Base URL**: `/sense360-flash/` (configured for GitHub Pages)
- **Build Output**: `dist/public/` (static files)
- **Deployment**: Automated via GitHub Actions
- **Custom 404**: SPA routing fallback included

### GitHub Actions Workflow
- Automated builds on push to main branch
- Node.js 20 build environment
- Deploys to GitHub Pages automatically
- Includes proper permissions and artifact handling

## Changelog

Changelog:
- July 03, 2025. Initial setup and complete deployment configuration

## User Preferences

Preferred communication style: Simple, everyday language.