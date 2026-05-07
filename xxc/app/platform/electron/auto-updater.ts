import {v4 as uuidv4} from 'uuid';
import {downloadFile} from './net';
import env, {getElectronRootPath} from './env';
import fse from './fs';
import {getStoreItem, setStoreItem, removeStoreItem} from '../../utils/store';
import {removeFileFromCache} from './file-cache';

/** 自动更新数据对象在本地存储中的键名 */
const UPDATER_INSTALL_DATA = 'UPDATER_INSTALL_DATA';

/**
 * 从服务器下载更新版本
 * @param user 当前用户
 * @param file 要下载的文件对象
 * @param onProgress 下载进度变更回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
export const downloadNewVersion = async (user: User, file: FileData, onProgress: (progress: number) => void) => {
    const downloadedFile = await downloadFile(user, file, { onProgress: (progress: number) => {onProgress?.((progress * 0.9) / 100);}});
    const tmpPath = window.nodeAPI.pathJoin(env.tmpPath, downloadedFile.gid || uuidv4());
    const {cachePath} = downloadedFile;
    onProgress?.(0.9);
    try {
        await fse.emptyDir(tmpPath);
    } catch (error) {
        return Promise.reject(error);
    }

    onProgress?.(0.95);

    try {
        window.nodeAPI.setProcessNoAsar(true);
        await window.nodeAPI.extractZip(cachePath, {dir: tmpPath});
        onProgress?.(1);
        removeFileFromCache(downloadedFile);
        window.nodeAPI.setProcessNoAsar(false);
        return tmpPath;
    } catch (error) {
        onProgress?.(1);
        error.code = 'UPDATER_UNZIP_ERROR';
        window.nodeAPI.setProcessNoAsar(false);
        return Promise.reject(error);
    }
};

const updaterFiles = {
    mac64: 'updater.mac',
    linux64: 'updater.linux64',
    linux32: 'updater.linux32',
    win64: 'updater.win64.exe',
    win32: 'updater.win32.exe',
};

type PlatformType = keyof typeof updaterFiles;

/**
 * 拷贝升级程序
 * @param platformID 平台识别字符串
 * @returns 升级程序目标目录
 */
export const copyUpdater = async (platformID: PlatformType): Promise<string> => {
    const updaterFileName = updaterFiles[platformID];
    if (!updaterFileName) {
        return Promise.reject(new Error('Cannot find updater program.'));
    }
    const updaterFile = process.env.HOT
        ? window.nodeAPI.pathResolve(env.appRoot, '../updater/bin', updaterFileName)
        : window.nodeAPI.pathJoin(env.appPath, 'bin', updaterFileName);
    const updaterDestPath = window.nodeAPI.pathJoin(env.tmpPath, updaterFileName);

    if (env.isWindowsOS) {
        fse.copySync(`${updaterFile}.manifest`, `${updaterDestPath}.manifest`);
    }

    await fse.copy(updaterFile, updaterDestPath);
    return updaterDestPath;
};

/**
 * 退出并安装升级
 * @param updaterStatus 升级状态对象
 */
export const quitAndInstall = async (updaterStatus: {downloadFileID: PlatformType;downloadedPath: string;name: string;}) => {
    const {downloadFileID, downloadedPath, name} = updaterStatus;
    const updaterFile = await copyUpdater(downloadFileID);
    const srcPath = window.nodeAPI.pathJoin(downloadedPath, env.isOSX ? `${name}.app` : name);
    const appPath = getElectronRootPath();
    const runPath = env.isOSX ? appPath : env.isWindowsOS ? window.nodeAPI.pathJoin(appPath, `${name}.exe`) : window.nodeAPI.pathJoin(appPath, name);
    // const logPath = `${updaterFile}.log`;
    // 立即关闭所有应用窗口并退出程序

    const args = [
        `-src="${srcPath}"`,
        `-app="${appPath}"`,
        `-run="${runPath}"`,
    ];
    const quitTask = {
        cwd: window.nodeAPI.pathDirname(updaterFile),
        type: 'execFile',
        file: updaterFile,
        args,
        command: `"${updaterFile}" ${args.join(' ')}`,
        isWindowsOS: env.isWindowsOS
    };
    if (env.isLinux) {
        args[2] = `&& ${runPath}`;
        quitTask.command = `pkexec "${updaterFile}" ${args.join(' ')}`;
    }
    if (env.isWindowsOS) {
        const batFile = `${updaterFile}.bat`;
        fse.outputFileSync(batFile, await window.nodeAPI.iconv.encode(`start "" ${quitTask.command}`, 'gbk'));
        quitTask.command = batFile;
        quitTask.file = 'cmd.exe';
        quitTask.args = ['/c', batFile];
    }
    setStoreItem(UPDATER_INSTALL_DATA, Object.assign(updaterStatus, {updaterFile, quitTask}));
    if (DEBUG) {
        localStorage.setItem('test.app.quit.task', JSON.stringify(quitTask));
    }
    await window.xuanAPI.quit(quitTask);
};

/**
 * 删除上次自动更新时产生的文件
 */
const cleanLastUpdaterFiles = async () => {
    const updaterData = getStoreItem(UPDATER_INSTALL_DATA);
    if (!updaterData) {
        return;
    }
    const {updaterFile, downloadedPath} = updaterData;

    try {
        if (updaterFile) {
            await fse.remove(updaterFile);
        }
        if (downloadedPath) {
            window.nodeAPI.setProcessNoAsar(true);
            await fse.remove(downloadedPath);
            window.nodeAPI.setProcessNoAsar(false);
        }
    } catch (error) {
        window.nodeAPI.setProcessNoAsar(false);
        console.error('clean last updator files error:', error);
    }
    removeStoreItem(UPDATER_INSTALL_DATA);
};

// 删除上次自动更新时产生的文件
if (!DEBUG) {
    cleanLastUpdaterFiles();
}

export default {
    quitAndInstall,
    downloadNewVersion,
    copyUpdater,
};
