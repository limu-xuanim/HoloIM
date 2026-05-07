#!/bin/bash

# 复制 libphp.so 及其所有依赖库到当前目录
# 使用方法: ./copy_deps.sh

# 设置颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 源库文件
SOURCE_LIB="./libphp.so"

# 检查源文件是否存在
if [ ! -f "$SOURCE_LIB" ]; then
    echo "错误: 找不到 $SOURCE_LIB"
    exit 1
fi

echo "正在分析 $SOURCE_LIB 的依赖..."
echo "=========================================="

# 获取所有依赖库并复制
ldd "$SOURCE_LIB" | while read -r line; do
    # 跳过 linux-vdso.so.1 (虚拟库)
    if [[ "$line" == *"linux-vdso"* ]]; then
        continue
    fi

    # 提取库文件路径
    lib_path=$(echo "$line" | grep -oP '=> \K[^ ]+' | grep -v '^(')

    # 如果是动态链接器 (例如 /lib64/ld-linux-x86-64.so.2)
    if [[ "$line" =~ (/lib.*ld-linux.*\.so\.[0-9]+) ]]; then
        lib_path="${BASH_REMATCH[1]}"
    fi

    # 复制文件
    if [ -n "$lib_path" ] && [ -f "$lib_path" ]; then
        lib_name=$(basename "$lib_path")

        # 检查文件是否已存在
        if [ -f "$lib_name" ]; then
            echo -e "${YELLOW}[跳过]${NC} $lib_name (已存在)"
        else
            cp "$lib_path" .
            echo -e "${GREEN}[复制]${NC} $lib_name <- $lib_path"
        fi
    fi
done

echo "=========================================="
echo "依赖库复制完成！"
echo ""
echo "复制的文件列表:"
ls -lh *.so* | awk '{print $9, "(" $5 ")"}'
