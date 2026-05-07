import {spawn, exec as nodeExec} from 'node:child_process';
import {EOL, platform} from 'node:os';
import {decode as iconvDecode} from 'iconv-lite';

/**
 * 将 wmic 命令转换为 PowerShell 命令
 * @param command 原始命令
 * @returns 转换后的命令，如果不是 wmic 命令则返回原命令
 */
function convertWmicToPowerShell(command: string): string {
    const isWin = platform() === 'win32';
    if (!isWin) {
        return command;
    }

    // 检测 wmic 命令
    const wmicMatch = command.match(/^\s*wmic\s+(.+)$/i);
    if (!wmicMatch) {
        return command;
    }

    const wmicArgs = wmicMatch[1].trim();
    
    // 处理常见的 wmic 命令
    // wmic process get caption,commandline
    if (wmicArgs.match(/^process\s+get\s+/i)) {
        const getArgs = wmicArgs.replace(/^process\s+get\s+/i, '').trim();
        const fields = getArgs.split(',').map(f => f.trim());
        
        // 构建 PowerShell 命令
        const selectFields: string[] = [];
        
        fields.forEach(field => {
            const lowerField = field.toLowerCase();
            if (lowerField === 'caption' || lowerField === 'name') {
                selectFields.push('ProcessName');
            } else if (lowerField === 'commandline') {
                // 使用转义的引号
                selectFields.push('@{Name=\\"CommandLine\\";Expression={(Get-CimInstance Win32_Process -Filter \\"ProcessId = $($_.Id)\\").CommandLine}}');
            } else if (lowerField === 'processid') {
                selectFields.push('Id');
            } else {
                // 其他字段尝试直接映射
                selectFields.push(field);
            }
        });
        
        // 构建完整的 PowerShell 命令
        let psCommand = 'Get-Process | Select-Object';
        if (selectFields.length > 0) {
            psCommand += ' ' + selectFields.join(', ');
        }
        
        return `powershell -NoProfile -Command "${psCommand}"`;
    }
    
    return command;
}

export default {
    spawn: async (command: string, args: string[], timeout = 0) => new Promise<[string, number | null]>((resolve) => {
        const child = spawn(command, args);
        const timer = timeout
            ? setTimeout(() => {
                child.kill();
            }, timeout)
            : null;

        const outputChunks: Uint8Array[] = [];
        child.stdout.on('data', data => {
            outputChunks.push(data);
        });

        const errorChunks: Uint8Array[] = [];
        child.stderr.on('data', (data) => {
            errorChunks.push(data);
        });

        child.on('close', (code) => {
            if (timer) {
                clearTimeout(timer);
            }

            const isWin = platform() === 'win32';
            const outputBuffer = Buffer.concat(outputChunks);
            const errorBuffer = Buffer.concat(errorChunks);
            const output = isWin ? iconvDecode(outputBuffer, 'gbk') : outputBuffer.toString('utf8');
            const error = isWin ? iconvDecode(errorBuffer, 'gbk') : errorBuffer.toString('utf8');

            const log = [output, error].filter(Boolean).join(EOL);
            resolve([log, code]);
        });
    }),
    exec: (command: string, options?: any, callback?: any) => {
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        
        const convertedCommand = convertWmicToPowerShell(command);
        
        // 如果命令被转换了，使用 shell 选项执行 PowerShell
        if (convertedCommand !== command) {
            const execOptions = {
                ...options,
                shell: true,
            };
            return nodeExec(convertedCommand, execOptions, callback);
        }
        
        return nodeExec(command, options, callback);
    },
};
