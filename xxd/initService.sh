#!/bin/bash

# XXD 服务初始化脚本 - 将 start.sh 注册为 systemd 服务

SERVICE_NAME="xxd"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
CURRENT_DIR=$(pwd)
START_SCRIPT="${CURRENT_DIR}/start.sh"

# 检查当前用户是否为 root
if [ "$(id -u)" -ne 0 ]; then
    echo "错误: 此脚本需要以 root 权限运行"
    echo "请使用: sudo $0"
    exit 1
fi

# 检查 start.sh 是否存在
if [ ! -f "$START_SCRIPT" ]; then
    echo "错误: start.sh 脚本不存在于当前目录: $CURRENT_DIR"
    exit 1
fi

# 检查 start.sh 是否可执行
if [ ! -x "$START_SCRIPT" ]; then
    echo "设置 start.sh 为可执行文件..."
    chmod +x "$START_SCRIPT"
fi

# 创建日志目录
LOG_DIR="${CURRENT_DIR}/log"
echo "创建日志目录: $LOG_DIR"
mkdir -p "$LOG_DIR"
chmod 755 "$LOG_DIR"

# 创建 systemd 服务文件
echo "创建 systemd 服务文件: $SERVICE_FILE"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=XXD Service
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=$CURRENT_DIR
ExecStart=$START_SCRIPT
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$SERVICE_NAME

# 安全设置
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
EOF

# 设置服务文件权限
chmod 644 "$SERVICE_FILE"

# 重新加载 systemd 配置
echo "重新加载 systemd 配置..."
systemctl daemon-reload

# 启用服务开机自启
echo "启用 $SERVICE_NAME 服务开机自启..."
systemctl enable $SERVICE_NAME

echo ""
echo "服务安装完成!"
echo ""
echo "使用方法:"
echo " 启动服务: systemctl start $SERVICE_NAME"
echo " 停止服务: systemctl stop $SERVICE_NAME"
echo " 重启服务: systemctl restart $SERVICE_NAME"
echo " 查看状态: systemctl status $SERVICE_NAME"
echo " 查看日志: journalctl -u $SERVICE_NAME -f"
echo ""
echo "服务将在系统启动时自动运行"