#!/bin/bash

# XXD 启动脚本 - 设置 FrankenPHP 环境变量并提供服务管理功能

xxdPath="/opt/xxd/xxd"
phpPath="/opt/xxd/php"
SERVICE_NAME="xxd"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
PID_FILE="/var/run/${SERVICE_NAME}.pid"

print_help() {
    cat <<EOF
用法: $0 [命令] [选项]

命令:
  start           启动 xxd
  start -b        启动 xxd（nohup 后台运行；启动前先执行升级检查）
  stop            停止后台运行的 xxd
  restart         重启 xxd
  auth            交互式设置 Adminer 登录账号密码
  install-service 将 xxd 注册为 systemd 服务
  uninstall-service 卸载 xxd 的 systemd 服务
  help, -h, --help
                  显示本帮助信息
EOF
}

detect_paths() {
    # 判断脚本运行目录下是否存在文件夹php以及可执行文件xxd
    # 如果两个都存在，那么替换phpPath为 './php'
    if [ -d "./php" ] && [ -f "./xxd" ] && [ -x "./xxd" ]; then
        xxdPath="./xxd"
        phpPath="./php"
    fi

    # 判断是否存在文件夹phpPath以及是否存在文件xxdPath
    # 如果不存在，那么终止运行并输出错误
    if [ ! -d "$phpPath" ]; then
        echo "错误: PHP目录不存在: $phpPath"
        exit 1
    fi

    if [ ! -f "$xxdPath" ]; then
        echo "错误: XXD可执行文件不存在: $xxdPath"
        exit 1
    fi

    if [ ! -x "$xxdPath" ]; then
        echo "错误: XXD文件不可执行: $xxdPath"
        exit 1
    fi
}

detect_loader() {
    # 检测系统架构并选择对应的动态链接器
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64)
            LD_LOADER="ld-linux-x86-64.so.2"
            ;;
        aarch64)
            LD_LOADER="ld-linux-aarch64.so.1"
            ;;
        *)
            echo "错误: 不支持的架构: $ARCH"
            exit 1
            ;;
    esac
}

run_xxd_foreground() {
    detect_paths
    detect_loader

    chmod 777 "$phpPath/lib/$LD_LOADER" 2>/dev/null || true
    
    # 执行 xxd 并传递所有参数（使用 "$@" 更兼容）
    echo "$phpPath/lib/$LD_LOADER --library-path $phpPath/lib $xxdPath $*"
    "$phpPath/lib/$LD_LOADER" --library-path "$phpPath/lib" "$xxdPath" "$@"
}

run_xxd_background() {
    detect_paths
    detect_loader

    chmod 777 "$phpPath/lib/$LD_LOADER"
    "$phpPath/lib/$LD_LOADER" --library-path "$phpPath/lib" "$xxdPath" -check-upgrade || true
    echo ""
    echo "以 nohup 后台方式启动 xxd ..."
    nohup "$phpPath/lib/$LD_LOADER" --library-path "$phpPath/lib" "$xxdPath" >/dev/null 2>&1 &
    echo $! > "$PID_FILE"
    echo "xxd 已后台启动, PID: $(cat "$PID_FILE")"
}

# 交互式设置 Adminer 登录账号密码（写入运行目录的 users 文件，供 adminer.php 的 HTTP Basic 校验使用）
setup_adminer_interactive() {
    detect_paths
    detect_loader

    local run_dir xxd_abs
    xxd_abs="$(readlink -f "$xxdPath" 2>/dev/null)" || xxd_abs="$(realpath "$xxdPath" 2>/dev/null)"
    if [ -z "$xxd_abs" ]; then
        xxd_abs="$(cd "$(dirname "$xxdPath")" && pwd)/$(basename "$xxdPath")"
    fi
    run_dir="$(dirname "$xxd_abs")"
    local passwd_file="${run_dir}/users"

    echo "正在设置 Adminer 访问控制账号"
    read -r -p "account: " adminer_user
    if [ -z "$adminer_user" ]; then
        echo "用户名为空，已取消。"
        return 1
    fi
    read -r -s -p "password: " adminer_pass
    echo
    if [ -z "$adminer_pass" ]; then
        echo "密码为空，已取消。"
        return 1
    fi
    read -r -s -p "password (again): " adminer_pass2
    echo
    if [ "$adminer_pass" != "$adminer_pass2" ]; then
        echo "两次密码不一致，已取消。"
        return 1
    fi

    chmod 777 "$phpPath/lib/$LD_LOADER" 2>/dev/null || true
    "$phpPath/lib/$LD_LOADER" --library-path "$phpPath/lib" "$xxdPath" -rdir "$run_dir" -adminer-passwd-user "$adminer_user" -adminer-passwd-password "$adminer_pass" || true
    return 0
}

stop_xxd() {
    local pid=""
    local process_found=false
    
    # Try to get PID from file
    if [ -f "$PID_FILE" ]; then
        pid=$(cat "$PID_FILE" 2>/dev/null)
    fi
    
    # Check if process from PID file is running
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        process_found=true
    else
        # Try to find process by pattern (fallback)
        pid=$(pgrep -f '/opt/zbox/run/xxd/xxd' 2>/dev/null | head -1) || \
        pid=$(pgrep -f 'xxd$' 2>/dev/null | head -1) || \
        pid=""
        
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            process_found=true
        fi
    fi
    
    # If no process found, just clean up and return
    if [ "$process_found" = false ]; then
        [ -f "$PID_FILE" ] && rm -f "$PID_FILE" 2>/dev/null
        echo "XXD 进程未运行。"
        return 0
    fi
    
    # Send TERM signal
    echo "正在停止 XXD 进程 (PID: $pid)..."
    kill "$pid" 2>/dev/null
    
    # Wait for graceful shutdown (max 5 seconds)
    local wait_count=0
    while [ $wait_count -lt 5 ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "XXD 已停止。"
            rm -f "$PID_FILE" 2>/dev/null
            return 0
        fi
        sleep 1
        wait_count=$((wait_count + 1))
    done
    
    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        echo "XXD 未能停止，强制终止..."
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi
    
    # Also kill any remaining processes by pattern
    pkill -9 -f '/opt/zbox/run/xxd/xxd' 2>/dev/null || true
    
    # Clean up PID file
    rm -f "$PID_FILE" 2>/dev/null
    
    if ! kill -0 "$pid" 2>/dev/null; then
        echo "XXD 已停止。"
        return 0
    else
        echo "警告: 无法停止 XXD 进程。"
        return 1
    fi
}

install_service() {
    if ! command -v systemctl >/dev/null 2>&1; then
        echo "错误: 当前系统未检测到 systemd/systemctl，无法自动安装服务。"
        exit 1
    fi

    SCRIPT_PATH="$(readlink -f "$0")"
    SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"

    cat <<EOF | sudo tee "$SERVICE_FILE" >/dev/null
[Unit]
Description=XXD Service
After=network.target

[Service]
Type=simple
WorkingDirectory=$SCRIPT_DIR
ExecStart=$SCRIPT_PATH start
ExecStop=/bin/kill -9 $MAINPID
Restart=on-failure
User=$(whoami)
Group=$(id -gn)

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    echo "已生成 systemd 服务文件: $SERVICE_FILE"
    echo "你可以使用以下命令管理服务:"
    echo "  sudo systemctl start  ${SERVICE_NAME}"
    echo "  sudo systemctl stop   ${SERVICE_NAME}"
    echo "  sudo systemctl restart ${SERVICE_NAME}"
    echo "  sudo systemctl enable ${SERVICE_NAME}"
    echo "  sudo systemctl status ${SERVICE_NAME}"
}

uninstall_service() {
    if ! command -v systemctl >/dev/null 2>&1; then
        echo "错误: 当前系统未检测到 systemd/systemctl，无法自动卸载服务。"
        exit 1
    fi
    
    sudo systemctl disable $SERVICE_NAME
    sudo systemctl stop $SERVICE_NAME
    sudo systemctl daemon-reload
    sudo rm -f $SERVICE_FILE
    echo "已卸载 systemd 服务: $SERVICE_NAME"
}

command="$1"
option="$2"

case "$command" in
    "" )
        # 无参数时等价于 start
        run_xxd_foreground "$option"
        ;;
    start )
        if [ "$option" = "-b" ]; then
            run_xxd_background
        else
            # 跳过命令名 "start"，传递剩余参数
            shift
            run_xxd_foreground "$@"
        fi
        ;;
    stop )
        stop_xxd
        ;;
    restart )
        stop_xxd || true
        sleep 1
        run_xxd_background
        ;;
    auth          )
        setup_adminer_interactive
        ;;
    install-service )
        install_service
        ;;
    uninstall-service )
        uninstall_service
        ;;
    help|-h|--help )
        print_help
        ;;
    -b )
        # 兼容直接 ./start.sh -b 的方式
        run_xxd_background
        ;;
    * )
        echo "错误: 未知命令: $command"
        echo "使用 '$0 --help' 查看帮助。"
        exit 1
        ;;
esac
