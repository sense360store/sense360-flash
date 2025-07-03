# Sense360 Flash - ESP32 Firmware Flashing Tool

A modern, browser-based ESP32 firmware flashing tool designed for Sense360 IoT devices. Flash firmware directly from your web browser using the Web Serial API, with automatic firmware discovery from GitHub Releases.

## 🚀 Live Demo

**Production**: [https://sense360store.github.io/sense360-flash/](https://sense360store.github.io/sense360-flash/)

## ✨ Features

- **Browser-Based Flashing**: No software installation required
- **GitHub Integration**: Automatic firmware discovery from releases
- **Multi-Device Support**: Air Quality Monitor, CO2 Monitor, Sense360 V2
- **Version Management**: Stable, Beta, and Factory firmware types
- **Real-Time Progress**: Live flashing progress and terminal output
- **Admin Panel**: Device MAC address mapping and restrictions
- **Troubleshooting**: Built-in help and compatibility guide

## 🛠 Supported Hardware

- **ESP32 Chips**: ESP32-D0WD, ESP32-S2, ESP32-S3, ESP32-C3
- **USB-Serial Chips**: CP2102, CH340, FTDI
- **Browsers**: Chrome 89+, Edge 89+, Opera 75+ (Web Serial API required)

## 📱 Usage

1. **Connect Device**: Plug your ESP32 device via USB
2. **Select Firmware**: Choose from available versions
3. **Flash**: Click "Flash Firmware" and wait for completion
4. **Configure**: Set up Wi-Fi after flashing

## 🔧 Development

### Prerequisites

- Node.js 20+
- Modern browser with Web Serial API support

### Local Development

```bash
# Clone the repository
git clone https://github.com/sense360store/sense360-flash.git
cd sense360-flash

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5000` to access the development environment.

### Building for Production

```bash
# Build the project
npm run build

# Output will be in dist/public/
```

## 📦 Firmware Management

### Adding New Firmware

1. Create a new release in this GitHub repository
2. Upload `.bin` files using the naming convention:
   ```
   {family}.{version}.{type}.bin
   ```
   
   Examples:
   - `air_quality_monitor.v1.0.0.factory.bin`
   - `co2_monitor.v1.1.0.beta.bin`
   - `sense360_v2.v2.0.0.factory.bin`

3. The web tool automatically discovers new firmware

### Supported Families

- `air_quality_monitor` - Air Quality Monitor devices
- `co2_monitor` - CO2 Monitor devices  
- `sense360_v2` - Sense360 V2 devices

### Release Types

- `factory` - Stable production firmware
- `beta` - Testing/preview firmware
- `stable` - Latest stable release

## 🔐 Admin Features

Access the admin panel with password `admin123` to:

- Map device MAC addresses to specific firmware families
- Restrict firmware versions per device
- View system statistics and GitHub API status

## 🌐 Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 89+ | ✅ Supported |
| Edge | 89+ | ✅ Supported |
| Opera | 75+ | ✅ Supported |
| Firefox | Any | ❌ Not supported* |
| Safari | Any | ❌ Not supported* |

*Web Serial API not available

## 🚨 Troubleshooting

### Device Not Detected

- Use a data USB cable (not charging-only)
- Hold BOOT button while connecting
- Install USB drivers (CP2102/CH340)
- Try a different USB port

### Browser Permissions

- Allow USB device access when prompted
- Enable "Experimental Web Platform Features" in Chrome
- Use HTTPS or localhost for Web Serial API

### Flashing Errors

- Hold BOOT button during entire process
- Ensure stable USB connection
- Close other serial applications
- Try erasing flash first

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

- **Documentation**: [View detailed docs](DEPLOYMENT.md)
- **Issues**: [Report bugs or request features](https://github.com/sense360store/sense360-flash/issues)
- **Discussions**: [Community support](https://github.com/sense360store/sense360-flash/discussions)

---

**Built with ❤️ for the ESP32 community**