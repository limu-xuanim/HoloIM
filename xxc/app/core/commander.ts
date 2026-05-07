import {getSearchParam} from '../utils/html-helper';

type CommandContext = Record<string, any>;

export type Command = {
    name: string;
    func: (context: CommandContext, ...params: any[]) => any;
    context?: CommandContext;
    apiLevel?: number;
    extension?: string;
}

/**
 * 用于保存注册的命令
 */
const commands = new Map<string, Command>();

/**
 * 获取当前命令上下文参数
 * @param newContexts 新的上下文参数
 * @returns 上下文参数对象
 */
const getCommandContext = (...newContexts: CommandContext[]): CommandContext => Object.assign({}, ...newContexts);

/**
 * 是否注册指定名称的命令
 * @param commandName 命令名称
 * @returns 如果返回 `true` 则为是，否则为不是
 */
export const isRegisteredCommand = (commandName: string) => commands.has(commandName);

/**
 * 执行命令
 * @param command 命令名称或命令对象
 * @param thisContext 上下文参数对象
 * @param params 命令参数
 * @returns 通过 Promise 返回命令执行结果
 */
export const executeCommandWithContext = (commandName: string, thisContext: CommandContext, ...params: any[]) => {
    const command = commands.get(commandName);
    if (!command) {
        return Promise.resolve(new Error(`Unknown command '${commandName}'.`));
    }

    let searchOptions = null;
    if (params?.length && typeof params[params.length - 1] === 'object') {
        searchOptions = params[params.length - 1];
    }
    const commandContext = getCommandContext(searchOptions ? {options: searchOptions} : null, thisContext);
    if (command.context) {
        Object.assign(commandContext, command.context);
    }

    const result = command.func(commandContext, ...params);

    if (DEBUG) {
        console.collapse('Command.execute', 'redBg', commandName, 'redPale');
        console.log('context', commandContext);
        console.log('command', command);
        console.log('params', params);
        console.log('result', result);
        console.log('searchOptions', searchOptions);
        console.groupEnd();
    }

    if (result instanceof Promise) {
        return result;
    }
    if (result instanceof Error) {
        return Promise.reject(result);
    }
    return Promise.resolve(result);
};

/**
 * 执行命令
 * @param command 命令名称或命令对象
 * @param params 命令参数
 * @returns 通过 Promise 返回命令执行结果
 */
export const executeCommand = <Key extends keyof RegisteredCommand>(command: Key, ...params: Parameters<RegisteredCommand[Key]>): Promise<ReturnType<RegisteredCommand[Key]>> => executeCommandWithContext(command, null, ...params);

/**
 * 根据命令文本字符串执行命令
 * @param commandLine 命令文本字符串
 * @param commandContext 命令上下文参数
 * @returns 通过 Promise 返回命令执行结果
 */
export const executeCommandLine = (commandLine: string, commandContext: CommandContext = null): Promise<any> => {
    if (commandLine.includes('|')) {
        return Promise.all(commandLine.split('|').map(cLine => executeCommandLine(cLine, commandContext)));
    }
    const params = commandLine.split('/');
    const convertedParams = params.map((p, idx) => {
        if (p[0] === '?' && idx === (params.length - 1)) {
            return getSearchParam(null, p);
        }
        return decodeURIComponent(p);
    });
    return executeCommandWithContext(convertedParams.shift() as string, commandContext, ...convertedParams);
};

/**
 * 创建命令对象
 * @param name 命令名称或者命令配置对象
 * @param func 命令操作函数
 * @param commandContext 命令上下文参数
 * @returns 返回创建的命令对象
 */
const createCommandObject = (
    name: string,
    func: (context: CommandContext, ...prams: any[]) => any,
    commandContext: CommandContext = null
) => {
    const command: Command = {name, func};
    if (commandContext) {
        command.context = commandContext;
    }
    return command;
};

/**
 * 注册命令
 * @param name 命令名称或者命令配置对象
 * @param func 命令操作函数
 * @param commandContext 命令上下文参数
 * @param options 其他命令参数
 * @returns 如果为 true，则命令注册成功；否则注册失败，通常失败的原因是已有相同名称的命令注册过
 */
export const registerCommand = (
    name: string,
    func: (context: CommandContext, ...params: any[]) => any,
    commandContext: CommandContext | null = null,
    options: Partial<{apiLevel: number;}> | null = null
) => {
    const command = createCommandObject(name, func, commandContext);
    if (commands.get(command.name)) {
        if (DEBUG) {
            console.warn(`Command register failed, because the command '${command.name}' is already registered.`);
        }
        return false;
    }
    if (typeof options === 'object' && options) {
        Object.assign(command, options);
    }

    commands.set(command.name, command);
    return true;
};

/**
 * 取消注册命令
 * @param name 命令名称
 * @returns 如果为 true，表示成功取消注册命令；否则取消注册失败，通常失败的原因是该名称的命令从没有注册过，或者已经被取消
 */
export const unregisterCommand = (name: string) => commands.delete(name);

if (DEBUG) {
    global.$executeCommand = executeCommand;
    global.$commands = commands;
}

const commander = {
    executeCommand,
    executeCommandLine,
    registerCommand,
    unregisterCommand
};

export default commander;
