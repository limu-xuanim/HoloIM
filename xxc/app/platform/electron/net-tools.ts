import CodedError, {Codes} from '../../utils/coded-error';
import env from './env';

const isWin = env.isWindowsOS;

/**
 * 执行 DNS 解析操作
 * @param  hostname 主机名称
 * @returns 使用 Promise 异步返回处理结果
 */
export const dnsLookup = async (hostname: string) => {
    try {
        const {address} = await window.nodeAPI.dnsLookupPromise(hostname);
        return address;
    } catch (error) {
        return Promise.reject(CodedError.create(error, Codes.NET_LOOKUP_FAIL));
    }
};

/**
 * 执行 Ping 操作
 * @param hostname 主机名称或 IP 地址
 * @returns 使用 Promise 异步返回处理结果
 */
export const ping = async (hostname: string, timeout = 10 * 1000) => {
    try {
        const [log, code] = await window.nodeAPI.spawn('ping', isWin ? [hostname] : ['-c', '4', hostname], timeout);
        if (code === 0 || code === null) {
            return log;
        }

        throw new CodedError(Codes.NET_PING_FAIL, `${hostname} is dead.`, {detail: log});
    } catch (pingError) {
        throw CodedError.create(pingError, Codes.NET_PING_FAIL);
    }
};

/**
 * 执行 traceroute 操作
 * @param hostname 主机名或 IP 地址
 * @param onHop 当 Hop 时的回调函数
 * @param onDestination 当到达目的地的回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
export const traceroute = async (hostname: string, timeout = 10 * 1000) => {
    try {
        const [log, code] = await window.nodeAPI.spawn(isWin ? 'tracert' : 'traceroute', [hostname], timeout);
        if (code === 0 || code === null) {
            return log;
        }

        throw new CodedError(Codes.NET_TRACEROUTE_ERROR, `traceroute result code is ${code}.`, {detail: log});
    } catch (error) {
        throw CodedError.create(error, Codes.NET_TRACEROUTE_ERROR);
    }
};

/**
 * 将 IP 转换为整数
 * @param ipAddress IP 地址
 * @returns 转换后的整数
 */
function ipToInt(ipAddress: string) {
    const ipMatch = ipAddress.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
        return (+ipMatch[1] << 24) + (+ipMatch[2] << 16) + (+ipMatch[3] << 8) + (+ipMatch[4]);
    }
    return null;
}

/**
 * 将子网掩码转换为整数
 * @param maskSize 子网掩码
 * @returns 转换后的整数
 */
function maskToInt(maskSize: number) {
    return -1 << (32 - maskSize);
}

/**
 * 判断给定ip是否在本地网络中
 * @see https://stackoverflow.com/a/503238
 * @see http://cisco.num.edu.mn/CCNA_R&S1/course/module8/#8.1.2.6
 * @param ip 检查的ip，形如 'xxx.xxx.xxx.xxx'
 * @return 是否在本地网络
 */
export function isSameSubnet(ip: string) {
    const ipInt = ipToInt(ip);
    if (ipInt === null) {
        return false;
    }

    const networkInterfaces = Object.values(window.nodeAPI.osNetworkInterfaces())
        .filter(networkInterface => networkInterface?.[0].internal === false);

    for (const networkInterface of networkInterfaces) {
        if (!networkInterface) continue;

        for (const ipInfo of networkInterface) {
            if (ipInfo.family === 'IPv6') continue;
            if (ipInfo.cidr === null) continue;

            const [interfaceIp, interfaceMask] = ipInfo.cidr.split('/');
            const interfaceIpInt = ipToInt(interfaceIp);
            if (interfaceIpInt === null) continue;
            // 将转换完的整数，按位进行与运算，结果相同则为同一网段
            if ((ipInt & maskToInt(+interfaceMask)) === (interfaceIpInt & maskToInt(+interfaceMask))) {
                return true;
            }
        }
    }

    return false;
}

/**
 * 获取本机 DNS 服务器列表
 * @return DNS 服务器列表
 */
export function getNameServers() {
    return window.nodeAPI.dnsGetServers();
}

export default {
    dnsLookup,
    ping,
    traceroute,
    getNameServers,
    isSameSubnet
};
