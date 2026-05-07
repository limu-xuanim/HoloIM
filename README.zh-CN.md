[English](../README.md) | 简体中文

<p align="center"><a href="https://www.xuanim.com" target="_blank" rel="noopener noreferrer"><strong>喧喧</strong></a></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL_3.0-blue" alt="License"></a>
  <a href="https://www.xuanim.com"><img src="https://img.shields.io/badge/Website-www.xuanim.com-blue" alt="Website"></a>
  <a href="https://www.xuanim.com/download"><img src="https://img.shields.io/badge/Download-喧喧下载-green" alt="Download"></a>
  <a href="https://www.xuanim.com/forum/"><img src="https://img.shields.io/badge/Forum-论坛-orange" alt="Forum"></a>
</p>

# 简介

**喧喧**是一款面向企业协作场景的开源即时通讯与智能协作平台，支持私有化部署，提供组织通讯录、一对一与群组聊天、消息记录与检索、后台管理等能力。开源版保留喧喧的核心通讯能力，适合在自有环境中搭建安全、可控、可定制的协作入口。

本仓库英文说明与对外品牌使用 **xuanim**，代码与能力基于喧喧开源社区版。更多发布背景与官方安装包见：[喧喧开源版动态](https://www.xuanim.com/dynamic/190)。

# 设计理念

- **数据可控**：支持私有化部署，消息与附件落在企业自有基础设施内，便于满足合规与审计要求。
- **架构清晰**：客户端（Electron + React）、消息中转（Go）、管理后台（PHP）分层维护，便于扩展与二次开发。
- **贴近办公场景**：以通讯录与组织关系为基础，覆盖常见 IM 能力（会话、群组、消息操作、管理后台），减少与现有办公流程的割裂感。

# 核心功能

## 客户端

- 通讯录与组织成员查看
- 一对一聊天、讨论组聊天
- 文字、图片、表情等基础消息类型
- 消息复制、转发、置顶、撤回、免打扰
- 讨论组管理：成员、群名、退出与解散
- @ 群成员、消息记录查询与管理
- 个人资料、密码、头像、在线状态与系统设置

## 后台管理

- 状态监控与系统统计
- 服务器配置
- 系统群开关控制
- 组织架构管理
- 用户与权限管理

## 服务端

- HTTP 登录与附件上传接口
- WebSocket 聊天通道
- HTTPS、AES 与传输压缩等安全与性能选项
- MySQL 存储、STUN 支持
- 多语言与服务化运行

# 代码结构

```text
.
├── xxb/  # 后台管理端（PHP）
├── xxc/  # 客户端（Electron + React，含桌面与浏览器构建）
├── xxd/  # 消息中转服务（Go）
├── LICENSE
└── DISCLAIMER
```

# 从源码构建

生产环境建议优先使用[官方发布包](https://www.xuanim.com/download)（客户端、XXD、Zbox 等）。若需从源码开发或打包，进入对应子目录操作。

## 客户端（`xxc`）

```bash
cd xxc
npm install
npm run hot-server
npm run start-hot
```

常用脚本：`npm run build`、`npm run package-linux` / `package-win` / `package-mac`、`npm run package-browser`、`npm run docs`。详见 [xxc/README.md](xxc/README.md)、[xxc/testing.md](xxc/testing.md)。

## 消息中转（`xxd`）

```bash
cd xxd
make build
```

构建产物位于 `xxd/release/`；版本号默认读取 `xxb/VERSION`，可通过 `make build VERSION=…` 覆盖。配置参考 [xxd/config/xxd.conf.sample](xxd/config/xxd.conf.sample)。

## 后台打包（`xxb`）

```bash
cd xxb
make
```

生成 `xxb.<version>.zip` 便于部署。

# 技术栈

- 客户端：Electron、React、TypeScript/JavaScript、Webpack、Biome
- 消息中转：Go、WebSocket、FrankenPHP、MySQL
- 管理后台：PHP

# 官网与资源

- [喧喧官网](https://www.xuanim.com)
- [开源版说明与下载入口](https://www.xuanim.com/download)
- [使用与文档](https://www.xuanim.com/book/)
- [论坛](https://www.xuanim.com/forum/)

# 安全漏洞

若发现安全漏洞，请通过官方渠道或社区负责任地反馈，勿在公开议题中披露可利用细节。

# 许可证

本项目基于 [GNU Affero General Public License v3.0](LICENSE) 发布。通过网络提供服务时须遵守 AGPLv3。使用前请阅读 [DISCLAIMER](DISCLAIMER)；软件仅供合法用途，使用者需自行遵守所在地法律法规。

<details>
<summary><strong>关于上游喧喧产品线</strong></summary>

喧喧由禅道团队维护，除开源版外还提供商业版本与配套服务。功能边界与授权以[官网](https://www.xuanim.com)说明为准；本仓库为可自由获取的开源代码，不代表与商业发行版功能一一对应。

</details>
