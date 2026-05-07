import {OSType, PlatformType} from '~/app/constants';

/**
 * 获取操作系统类型
 * @returns 操作系统类型
 */
export function getOSType() {
    const {userAgent} = window.navigator;
    if (userAgent.match(/(Mac OS|MacPPC|MacIntel|Mac_PowerPC|Macintosh)/i)) {
        return OSType.mac;
    }
    if (userAgent.match(/(Linux|X11(?!.*CrOS))/i)) {
        return OSType.linux;
    }
    return OSType.win;
}

/**
 * 判断当前操作系统类型是否为给定类型
 * @param type 操作系统类型
 * @returns 如果返回 `true` 则为是，否则为不是
 */
export function isOSType(type: ValueOf<typeof OSType>): boolean {
    return getOSType() === type;
}

/**
 * 获取平台类型
 * @returns 平台类型
 */
export function getPlatformType(): ValueOf<typeof PlatformType>{
    const {userAgent} = window.navigator;
    if (userAgent.match(/Electron/i)) {
        return PlatformType.electron;
    }
    return PlatformType.browser;
}
