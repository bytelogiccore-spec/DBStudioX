# 🗄️ DBStudioX

> A modern, cross-platform database management tool powered by sqlite3x v0.0.3

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Workflow-blue.svg)](https://github.com/bytelogiccore-spec/DBStudioX/actions)

---

## ✨ Features

- 🚀 **High Performance** - Powered by sqlite3x Rust backend
- 🎨 **Modern UI** - Designed with Google Stitch AI
- 📊 **Visual Query Results** - TanStack Table powered display
- 📈 **Performance Monitoring** - Real-time stats dashboard
- 🔔 **Event Notifications** - Data change detection & alerts
- 💻 **Cross-Platform** - Windows, macOS, Linux support
- 🔌 **Extensible** - Modular plugin architecture

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Tauri 2.0 |
| **Frontend** | Next.js 16, TypeScript |
| **Backend** | Rust, sqlite3x v0.0.3 |
| **UI Design** | Google Stitch AI |
| **SQL Editor** | Monaco Editor |
| **Data Grid** | TanStack Table |
| **Charts** | Recharts |

## 📦 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) stable
- npm (or pnpm)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/bytelogiccore-spec/DBStudioX.git
cd DBStudioX

# Install dependencies
pnpm install   # or: npm install

# Run in development mode
pnpm tauri dev   # or: npm run tauri:dev
```

### Build, Test & Lint

```bash
# Next.js static export
npm run build

# Run tests (Vitest: unit + Storybook)
npm test

# Lint
npm run lint

# Tauri production build
npm run tauri:build
```

## 🏗️ Project Structure

```
DBStudioX/
├── src/                 # Next.js frontend
│   ├── app/             # App Router pages
│   ├── components/      # React components
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilities (incl. Tauri IPC)
│   ├── services/        # Backend call layer
│   └── stores/          # Zustand stores
├── src-tauri/           # Tauri Rust backend
│   ├── src/commands/    # IPC command handlers
│   ├── src/sqlite3x/    # sqlite3x integration
│   └── src/events/      # Event emitters
├── .cursor/             # Cursor AI: rules & skills
│   ├── rules/           # Project rules (.mdc)
│   └── skills/          # Sub-agent skills (RUST, REACT, QA, etc.)
├── .agent/              # Workflows (company-style roles)
├── .storybook/          # Storybook + Vitest UI tests
└── docs/                # Documentation
```

## 🤖 Development & AI Agents

- **[AGENTS.md](AGENTS.md)** – Sub-Agent "company" layout: CEO assigns work to RUST, REACT, DESIGN, DEVOPS, DOCS, QA.
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** – Cursor rules, skills, and dev commands.

## 📖 Documentation

- **[Wiki](https://github.com/bytelogiccore-spec/DBStudioX/wiki)** – 프로젝트 개요, 빌드/배포, CI/CD 가이드
- [Wiki 활성화 가이드](docs/WIKI_ACTIVATION_GUIDE.md) – GitHub Wiki 설정 방법
- [Implementation Plan](IMPLEMENTATION_PLAN.md)
- [Development (Cursor, Rules, Commands)](docs/DEVELOPMENT.md)

## 🎨 Design System

DBStudioX uses [Google Stitch AI](https://labs.google/stitch) for UI design generation. The design system includes:

- Dark theme with accent colors
- Glassmorphism effects
- Smooth micro-animations
- Responsive layouts

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- **GitHub Repository**: [bytelogiccore-spec/DBStudioX](https://github.com/bytelogiccore-spec/DBStudioX)
- **Wiki**: [프로젝트 Wiki](https://github.com/bytelogiccore-spec/DBStudioX/wiki)
- **Issues**: [Report Issues](https://github.com/bytelogiccore-spec/DBStudioX/issues)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

---

Made with ❤️ by ByteLogicCore
