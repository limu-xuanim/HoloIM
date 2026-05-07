English | [简体中文](README.zh-CN.md)

<p align="center"><a href="https://www.xuanim.com" target="_blank" rel="noopener noreferrer"><strong>xuanim</strong></a></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL_3.0-blue" alt="License"></a>
  <a href="https://www.xuanim.com"><img src="https://img.shields.io/badge/Website-www.xuanim.com-blue" alt="Website"></a>
  <a href="https://www.xuanim.com/download"><img src="https://img.shields.io/badge/Download-Xuan-green" alt="Download"></a>
  <a href="https://www.xuanim.com/forum/"><img src="https://img.shields.io/badge/Forum-Forum-orange" alt="Forum"></a>
</p>

# Introduction

**xuanim** is an open-source instant messaging and collaboration stack for enterprises: on-premises deployment, organizational contacts, direct and group chat, message history and search, and server-side administration, with the core real-time capabilities needed for a secure and customizable deployment.

This repository uses **xuanim** for English-facing branding, and builds on the **Xuan** (喧喧) open-source community codebase. For upstream announcements and official bundles (clients, XXD, installers), see the [release notes page](https://www.xuanim.com/dynamic/190) (Chinese, includes download links).

# Design philosophy

- **You keep the data**: self-hosted deployment so messages and files stay on infrastructure you control, supporting compliance and audit expectations.
- **Clear layering**: client (Electron + React), relay server (Go), and admin back end (PHP) are separated for easier extension and customization.
- **Office-oriented**: built around directory and org structure, covering common IM scenarios without fighting existing workflows.

# Features

## Client

- Contacts and org directory
- Direct and group chat
- Text, images, emoji
- Copy, forward, pin, recall, mute
- Group lifecycle: members, rename, leave, dismiss
- @mentions, search and message history
- Profile, password, avatar, presence, settings

## Admin (back office)

- Monitoring and statistics
- Server configuration
- System group toggle
- Organization structure
- User and permission management

## Server

- HTTP login and file upload APIs
- WebSocket chat channel
- HTTPS, AES, and transport compression
- MySQL, STUN
- Multiple languages and service-style operation

# Repository layout

```text
.
├── xxb/  # Admin back end (PHP)
├── xxc/  # Client (Electron + React; desktop and browser)
├── xxd/  # Message relay (Go)
├── LICENSE
└── DISCLAIMER
```

# Building from source

For production, prefer [official release packages](https://www.xuanim.com/download). For development or custom builds, work inside each module.

## Client (`xxc`)

```bash
cd xxc
npm install
npm run hot-server
npm run start-hot
```

Common scripts: `npm run build`, `npm run package-linux` / `package-win` / `package-mac`, `npm run package-browser`, `npm run docs`. See [xxc/README.md](xxc/README.md) and [xxc/testing.md](xxc/testing.md).

## Relay server (`xxd`)

```bash
cd xxd
make build
```

Output under `xxd/release/`; version defaults to `xxb/VERSION`, override with `make build VERSION=…` if needed. Config sample: [xxd/config/xxd.conf.sample](xxd/config/xxd.conf.sample).

## PHP admin (`xxb`)

```bash
cd xxb
make
```

Produces `xxb.<version>.zip` for deployment.

# Tech stack

- Client: Electron, React, TypeScript/JavaScript, Webpack, Biome
- XXD: Go, WebSocket, FrankenPHP, MySQL
- Admin: PHP

# Official website & resources

- [Xuan website](https://www.xuanim.com)
- [Open-source edition & downloads](https://www.xuanim.com/download)
- [Documentation](https://www.xuanim.com/book/)
- [Forum](https://www.xuanim.com/forum/)

# Security

Please report security issues responsibly through official or community channels; avoid public posts with exploitable detail.

# License

Licensed under the [GNU Affero General Public License v3.0](LICENSE). Offering the software as a network service requires AGPL compliance. Read [DISCLAIMER](DISCLAIMER) before use; use only for lawful purposes under applicable law.

<details>
<summary><strong>Upstream Xuan product line</strong></summary>

Xuan is maintained by the ZenTao team. Commercial editions and services may differ from this open-source tree; see the [official site](https://www.xuanim.com) for product boundaries and licensing.

</details>
