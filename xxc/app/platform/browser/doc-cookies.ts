function getSExpires(vEnd: any) {
    if (typeof vEnd === 'number') {
        return vEnd === Infinity ? '; expires=Fri, 31 Dec 9999 23:59:59 GMT' : `; max-age=${vEnd}`;
    }
    if (typeof vEnd === 'string') {
        return `; expires=${vEnd}`;
    }
    if (vEnd instanceof Date) {
        return `; expires=${vEnd.toUTCString()}`;
    }

    return '';
}

function hasItem(sKey: string) {
    return (new RegExp(`(?:^|;\\s*)${encodeURIComponent(sKey).replace(/[-.+*]/g, '\\$&')}\\s*\\=`)).test(document.cookie);
}

const docCookies = {
    /**
     * 获取 Cookie
     * @param filter Cookie 信息
     * @param filter.name Cookie 名称
     * @returns Cookie 值
     */
    get(filter: {name: string;}): string | null {
        const {name} = filter;
        return decodeURIComponent(document.cookie.replace(new RegExp(`(?:(?:^|.*;)\\s*${encodeURIComponent(name).replace(/[-.+*]/g, '\\$&')}\\s*\\=\\s*([^;]*).*$)|^.*$`), '$1')) || null;
    },

    /**
     * 设置 Cookie
     * @param details Cookie 信息
     * @param details.url URL 信息
     * @param details.name Cookie 名称
     * @param details.value Cookie 值
     * @param details.domain Cookie Domain
     * @param details.path Cookie 路径
     * @param details.secure Cookie 路径
     * @param details.expirationDate Cookie 路径
     * @param details.SameSite Cookie 路径
     */
    set(details: Partial<{
        url: string;
        name:string;
        value: string;
        domain: string;
        path: string;
        secure: boolean;
        expirationDate: number|string|Date;
        SameSite: 'None'|'Strict'|'Lax';
    }> = {}) {
        const {url, name, value, expirationDate, domain, path, secure} = details;
        if (!name || !value || ['expires', 'max-age', 'path', 'domain', 'secure'].includes(name.toLowerCase())) {
            return;
        }
        const sDomain = domain ?? url ? new URL(url!).hostname : '';
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${getSExpires(expirationDate)}${sDomain ? `; domain=${sDomain}` : ''}${path ? `; path=${path}` : ''}${secure ? '; secure' : ''}`;
    },

    /**
     * 移除 Cookie
     * @param url URL 信息
     * @param name Cookie 名`称
     */
    remove(url: string, name: string) {
        if (!name || !hasItem(name)) {
            return;
        }
        const domain = url ? new URL(url).hostname : '';
        document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${domain ? `; domain=${domain}` : ''}`;
    },
};

export default docCookies;
