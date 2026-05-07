/* eslint-disable no-await-in-loop */

import type fs from 'node:fs';
import type {Abortable} from 'node:events';

/**
 * 判断给定路径是否为目录
 * @param p 给行路径
 * @returns 是否为目录
 */
export const isDirectory = (p: fs.PathLike): boolean => {
    return window.nodeAPI.fsIsDirectory(p)
};

/**
 * 同步判断目录或文件是否存在
 * @param fileOrDirPath 目录或文件路径
 * @returns 如果为 `true`，表示目录或文件路径存在
 */
export const pathExistsSync = (fileOrDirPath: fs.PathLike): boolean => {
    try {
        window.nodeAPI.fsAccessSync(fileOrDirPath);
        return true;
    } catch {
        return false;
    }
};

/**
 * 异步判断目录或文件是否存在
 * @param fileOrDirPath 目录或文件路径
 * @returns 使用 Promise 异步返回处理结果
 * @todo 检查fsPromises.access与fs.access未正常执行原因
 */
export const pathExists = async (fileOrDirPath: fs.PathLike): Promise<boolean> => {
    try {
        await window.nodeAPI.fsAccessPromise(fileOrDirPath);
        return true;
    } catch {
        return false;
    }
};

/**
 * 确保指定路径的目录存在，如果不存在则创建一个
 * @param dirPath 目录路径
 */
export const ensureDirSync = (dirPath: fs.PathLike) => {
    if (pathExistsSync(dirPath)) {
        return;
    }
    mkdirsSync(dirPath);
};

/**
 * 确保指定路径的目录存在，如果不存在则创建一个
 * @param dirPath 目录路径
 */
export const ensureDir = async (dirPath: fs.PathLike) => {
    if (await pathExists(dirPath)) {
        return;
    }
    await mkdirs(dirPath);
};

/**
 * 循环创建路径中的所有目录
 * @param p 要创建的目录路径
 * @param options 选项
 * @param options.recursive 递归创建
 * @param options.mode mode
 * @returns 创建的目录
 */
export const mkdirsSync = (p: fs.PathLike, options: fs.MakeDirectoryOptions = {recursive: true}): string => window.nodeAPI.fsMkdirSync(p, options);

/**
 * 异步 Promise 形式循环创建路径中的所有目录
 * @param p 要创建的目录路径
 * @param options 选项
 * @param options.recursive 递归创建
 * @returns 使用 Promise 异步返回处理结果
 */
export const mkdirs = (p: fs.PathLike, options: fs.MakeDirectoryOptions = {recursive: true}): Promise<string> => window.nodeAPI.fsMkdirPromise(p, options);

/**
 * 同步读取文件内容
 * @param file 文件路径
 * @param options 选项
 * @param options.encoding 编码，默认以 utf8 读取
 * @param options.flag flag
 * @returns 文件内容
 */
export const readFileSync = (file: fs.PathOrFileDescriptor, options: {encoding?: BufferEncoding; flag?: string;} = {}): string => window.nodeAPI.fsReadFileSync(file, {encoding: 'utf8', ...options});

/**
 * 异步读取文件内容
 * @param file 文件路径
 * @param options 选项
 * @param options.encoding 编码，默认以 utf8 读取
 * @param options.flag flag
 * @returns 文件内容
 */
export const readFile = (file: fs.PathLike, options: {encoding?: BufferEncoding; flag?: fs.OpenMode;} = {}): Promise<string> => window.nodeAPI.fsReadFilePromise(file, {encoding: 'utf8', ...options});

/**
 * 同步从文件读取 JSON 内容
 * @param file JSON 文件路径
 * @param options 选项
 * @param options.encoding 编码
 * @param options.flag flag
 * @param options.throws 是否抛错
 * @returns JSON 内容
 */
export const readJsonSync = (file: fs.PathOrFileDescriptor, options: {throws?: boolean; encoding?: BufferEncoding; flag?: string;} = {}): any => {
    try {
        const fileContent = readFileSync(file, options);
        if (fileContent.length) {
            return JSON.parse(fileContent);
        }
    } catch (error) {
        if (options?.throws) {
            throw error;
        }
    }
    return null;
};

/**
 * 异步从文件读取 JSON 内容
 * @param file JSON 文件路径
 * @param options 选项
 * @param options.encoding 编码
 * @param options.flag flag
 * @param options.throws 是否抛错
 * @returns JSON 内容
 */
export const readJson = async (file: fs.PathLike, options: {throws?: boolean; encoding?: BufferEncoding; flag?: fs.OpenMode;} = {}): Promise<any> => {
    try {
        const fileContent = await readFile(file, options);
        return JSON.parse(fileContent);
    } catch (error) {
        if (options?.throws) {
            throw error;
        }
        return null;
    }
};

/**
 * 使用同步方式将内容写入文件
 * @param file  文件路径
 * @param data 写入的数据
 * @param options 选项
 * @param options.encoding 编码，默认 utf8
 * @param options.mode mode
 * @param options.flag flag
 */
export const outputFileSync = (
    file: string,
    data: string|Buffer,
    options: (fs.ObjectEncodingOptions&Abortable&{mode?: fs.Mode; flag?: string;}) = {encoding: 'utf8'}
) => {
    const dir = window.nodeAPI.pathDirname(file);
    ensureDirSync(dir);
    window.nodeAPI.fsWriteFileSync(file, data, options);
};

/**
 * 使用异步方式将内容写入文件
 * @param {String} file 文件路径
 * @param {string|Buffer} data 写入的数据
 * @param {Object} [options] 选项
 * @param {string} [options.encoding='utf8'] 编码，默认 utf8
 * @param {number} [options.mode] mode
 * @param {string} [options.flag] flag
 * @todo 解决fs.writeFile不能正常执行的问题
 */
export const outputFile = async (
    file: string,
    data: string|NodeJS.ArrayBufferView|Iterable<string|NodeJS.ArrayBufferView>|AsyncIterable<string|NodeJS.ArrayBufferView>,
    options: (fs.ObjectEncodingOptions&{mode?: fs.Mode; flag?: fs.OpenMode;}&Abortable) = {encoding: 'utf8'}
) => {
    const dir = window.nodeAPI.pathDirname(file);
    await ensureDir(dir);
    await window.nodeAPI.fsWriteFilePromise(file, data, options);
};

/**
 * 异步方式输出 JSON 内容到文件
 * @param file 文件路径
 * @param data JSON 内容
 */
export const outputJson = (file: string, data: any, space = 2) => outputFile(file, JSON.stringify(data, null, space));

/**
 * 同步方式输出 JSON 内容到文件
 * @param file 文件路径
 * @param data JSON 内容
 */
export const outputJsonSync = (file: string, data: any, space = 2) => outputFileSync(file, JSON.stringify(data, null, space));

/**
 * 使用同步方式删除文件或文件夹
 * @param fileOrDir 文件或文件夹路径
 */
export const removeSync = (fileOrDir: fs.PathLike) => window.nodeAPI.fsRmSync(fileOrDir, {force: true, recursive: true});

/**
 * 使用异步方式删除文件或文件夹
 * @param fileOrDir 文件或文件夹路径
 */
export const remove = (fileOrDir: fs.PathLike) => window.nodeAPI.fsRmPromise(fileOrDir, {force: true, recursive: true});

/**
 * 将文件夹清空，如果不存在则创建一个
 * @param dir 文件夹路径
 */
export const emptyDirSync = (dir: string) => {
    let items: string[];
    try {
        items = window.nodeAPI.fsReaddirSync(dir);
    } catch {
        mkdirsSync(dir);
        return;
    }

    for (const item of items) {
        removeSync(window.nodeAPI.pathJoin(dir, item));
    }
};

/**
 * 将文件夹清空，如果不存在则创建一个
 * @param dir 文件夹路径
 */
export const emptyDir = async (dir: string) => {
    let items: string[];
    try {
        items = await window.nodeAPI.fsReaddirPromise(dir);
    } catch {
        await mkdirs(dir);
        return;
    }
    await Promise.all(items.map(item => remove(window.nodeAPI.pathJoin(dir, item))));
};

/**
 * 使用同步方式复制文件夹
 * @param dir 源文件夹路径
 * @param targetDir 目标文件夹路径
 */
export const copyDirSync = (dir: string, targetDir: string) => {
    ensureDirSync(targetDir);

    const items = window.nodeAPI.fsReaddirSync(dir);
    for (const item of items) {
        const itemPath = window.nodeAPI.pathJoin(dir, item);
        const targetItemPath = window.nodeAPI.pathJoin(targetDir, item);
        if (isDirectory(itemPath)) {
            copyDirSync(itemPath, targetItemPath);
        } else {
            window.nodeAPI.fsCopyFileSync(itemPath, targetItemPath);
        }
    }
};

/**
 * 使用异步方式复制文件夹
 * @param dir 源文件夹路径
 * @param targetDir 目标文件夹路径
 */
export const copyDir = async (dir: string, targetDir: string) => {
    await ensureDir(targetDir);

    const items = await window.nodeAPI.fsReaddirPromise(dir);
    for (const item of items) {
        const itemPath = window.nodeAPI.pathJoin(dir, item);
        const targetItemPath = window.nodeAPI.pathJoin(targetDir, item);
        const isDirectory = await window.nodeAPI.fsIsDirectoryPromise(itemPath);
        if (isDirectory) {
            await copyDir(itemPath, targetItemPath);
        } else {
            await copyFile(itemPath, targetItemPath);
        }
    }
};

/**
 * 使用同步方式复制文件
 * @param filePath 源文件路径
 * @param targetFilePath 目标文件路径
 */
export const copyFileSync = window.nodeAPI.fsCopyFileSync;

/**
 * 使用异步方式复制文件
 * @param filePath 源文件路径
 * @param targetFilePath 目标文件路径
 */
export const copyFile = window.nodeAPI.fsCopyFilePromise;

/**
 * 使用同步方式复制文件或文件夹
 * @param fileOrDir 源文件或文件夹路径
 * @param targetFileOrDir 目标文件或文件夹路径
 */
export const copySync = (fileOrDir: string, targetFileOrDir: string) => {
    if (isDirectory(fileOrDir)) {
        copyDirSync(fileOrDir, targetFileOrDir);
    } else {
        ensureDirSync(window.nodeAPI.pathDirname(targetFileOrDir));
        copyFileSync(fileOrDir, targetFileOrDir);
    }
};

/**
 * 使用异步方式复制文件或文件夹
 * @param fileOrDir 源文件或文件夹路径
 * @param targetFileOrDir 目标文件或文件夹路径
 */
export const copy = async (fileOrDir: string, targetFileOrDir: string) => {
    const isDirectory = await window.nodeAPI.fsIsDirectoryPromise(fileOrDir);
    if (isDirectory) {
        await copyDir(fileOrDir, targetFileOrDir);
    } else {
        await ensureDir(window.nodeAPI.pathDirname(targetFileOrDir));
        await copyFile(fileOrDir, targetFileOrDir);
    }
};

/**
 * 使用异步方式重命名文件
 * @param oldPath 源文件路径
 * @param newPath 目标文件路径
 */
export const rename = window.nodeAPI.fsRenamePromise;

/**
 * 使用同步方式重命名文件
 * @param oldPath 源文件路径
 * @param newPath 目标文件路径
 */
export const renameSync = window.nodeAPI.fsRenameSync;

const fse = {
    mkdirsSync,
    mkdirs,
    ensureDirSync,
    readFileSync,
    pathExistsSync,
    pathExists,
    readFile,
    readJsonSync,
    readJson,
    readJSONSync: readJsonSync,
    readJSON: readJson,
    outputFileSync,
    outputFile,
    removeSync,
    remove,
    emptyDirSync,
    emptyDir,
    copyDirSync,
    copyDir,
    copyFileSync,
    copyFile,
    copySync,
    copy,
    ensureDir,
    outputJson,
    outputJsonSync,
    outputJSON: outputJson,
    outputJSONSync: outputJsonSync,
    rename,
    renameSync,
    isDirectory
} as const;

export default fse;
export type PlatformFs = typeof fse;
