/**
 * 生成请求 URL
 * @param backendURL 后端地址
 * @param module 模块名
 * @param method 方法名
 * @param params 参数对象
 * @param options 选项
 * @param options.requestType 请求类型
 * @param options.requestFix 分隔符
 * @param options.type 模板类型
 * @returns URL
 */
export const generateRequestURL = (
    backendURL: string,
    module: string,
    method: string,
    params: Record<string, string|number|boolean> = {},
    options: {
        requestType?: string;
        requestFix?: string;
        type?: string;
    } = {}
) => {
    const {
        requestType = 'GET',
        requestFix = '-',
        type = 'html',
    } = options;
    module = encodeURIComponent(module);
    method = encodeURIComponent(method);
    backendURL = backendURL.endsWith('/') ? backendURL.slice(0, -1) : backendURL;
    if (requestType === 'PATH_INFO') {
        const arr = Object.values(params).map(x => encodeURIComponent(x));
        return `${backendURL}/${module}${requestFix}${method}${arr.length ? `${requestFix}${arr.join(requestFix)}` : ''}.${type}`;
    }
    return `${backendURL}/index.php?m=${module}&f=${method}${Object.entries(params).map(([key, value]) => `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('')}`;
};
