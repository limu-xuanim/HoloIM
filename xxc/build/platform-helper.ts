import os from 'node:os';
import {OSType} from '~/app/constants';

export type Platform = 'win' | 'mac' | 'linux' | 'browser';
export type Arch = 'x32' | 'x64' | 'arm64';

// 所支持的平台类型
const PLATFORMS = new Set<Platform>(['win', 'mac', 'linux', 'browser']);

// 所支持的架构类型
const ARCHS = new Set<Arch>(['x32', 'x64', 'arm64']);

/**
 * 获取当前操作系统平台类型
 */
function getCurrentPlatform() {
    const osPlatform = os.platform();
    if (osPlatform === 'linux') {
        return OSType.linux;
    }
    if (osPlatform === 'darwin') {
        return OSType.mac;
    }
    if (osPlatform === 'win32') {
        return OSType.win;
    }

    throw new Error('Unsupported platforms!');
}

/**
 * 获取当前操作系统平台架构类型
 */
function getCurrentArch() {
    if (os.arch().includes('32')) {
        return 'x32';
    }
    return 'x64';
}

// 格式化平台配置项
export function formatPlatforms(val: string|string[]): Platform[] {
    if (!val || !val.length) {
        return [getCurrentPlatform()];
    }

    const platforms = new Set(Array.isArray(val) ? val : val.toLowerCase().split(','));
    const platformsSet = new Set<Platform>();
    if (platforms.has('all') || platforms.has('*')) {
        return Array.from(PLATFORMS);
    }

    const currentPlatform = getCurrentPlatform();
    for (const platform of platforms) {
        if (PLATFORMS.has(platform as Platform)) {
            platformsSet.add(platform as Platform);
        } else if (platform === 'current' && currentPlatform) {
            platformsSet.add(currentPlatform);
        }
    }
    if (!platformsSet.size) {
        platformsSet.add(currentPlatform);
    }
    return Array.from(platformsSet);
}

// 格式化架构配置项
export function formatArchs(val: string|string[]): Arch[] {
    const currentArch = getCurrentArch();
    if (!val || !val.length) {
        return [currentArch];
    }
    const archs = new Set(Array.isArray(val) ? val : val.toLowerCase().split(','));
    const archsSet = new Set<Arch>();
    if (archs.has('all') || archs.has('*')) {
        return Array.from(ARCHS);
    }
    for (const arch of archs) {
        if (ARCHS.has(arch as Arch)) {
            archsSet.add(arch as Arch);
        } else if (arch === 'current') {
            archsSet.add(currentArch);
        }
    }
    if (!archsSet.size) {
        archsSet.add(currentArch);
    }
    return Array.from(archsSet);
}
