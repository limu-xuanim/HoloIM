import Config from '~/app/config';
import platformGetUrlMeta from '~/app/platform/common/url-meta';

/**
 * 浏览器地址解析缓存
 */
const urlMetaCaches = new Map<string, {meta: CardMeta; time: number;}>();

/**
 * 最大浏览器解析缓存大小
 */
const maxUrlCacheSize = 20;

export const defaultExtInspector = (url: string) => {
    return platformGetUrlMeta(url).then(meta => {
        if (!meta) {
            return {
                url,
                title: '',
            };
        }

        const {favicon} = meta;
        const cardMeta: CardMeta = {
            url,
            title: meta.title,
            image: meta.image,
            subtitle: meta.description && meta.description.length > 200 ? `${meta.description.substring(0, 150)}...` : meta.description,
            icon: favicon ? favicon.href : null
        };
        if (meta.isImage) {
            cardMeta.contentUrl = url;
            cardMeta.contentType = 'image';
            cardMeta.icon = 'mdi-image text-green icon-2x';
        } else if (meta.isVideo) {
            cardMeta.contentUrl = url;
            cardMeta.contentType = 'video';
            cardMeta.clickable = 'title';
            cardMeta.icon = 'mdi-video text-red icon-2x';
        } else if (meta.isAudio) {
            cardMeta.contentUrl = url;
            cardMeta.contentType = 'audio';
            cardMeta.clickable = 'title';
            cardMeta.icon = 'mdi-music text-yellow icon-2x';
        } else if (!cardMeta.title && !cardMeta.subtitle) {
            cardMeta.title = url;
        }
        if (cardMeta.image?.startsWith('//')) {
            cardMeta.image = `https:${cardMeta.image}`;
        }
        if (cardMeta.icon?.startsWith('//')) {
            cardMeta.icon = `https:${cardMeta.icon}`;
        }

        // Save cache
        if (urlMetaCaches.size > maxUrlCacheSize) {
            const cacheKeys = [...urlMetaCaches.entries()].sort((x, y) => x[1].time - y[1].time).map(x => x[0]);
            for (let i = 0; i < (cacheKeys.length - maxUrlCacheSize); ++i) {
                urlMetaCaches.delete(cacheKeys[i])
            }
        }
        urlMetaCaches.set(url, {meta: cardMeta, time: Date.now()});

        return Promise.resolve(cardMeta);
    });
};

/**
 * 解析浏览器地址信息
 * @param url 要解析的地址
 * @param disableCache 是否禁止使用缓存
 * @returns 使用 Promise 异步返回处理结果
 */
export const getUrlMeta = async (url: string, disableCache = false): Promise<CardMeta> => {
    if (!Config.ui['chat.urlInspector']) {
        return Promise.resolve({url, title: url});
    }
    if (!disableCache) {
        const urlMetaCache = urlMetaCaches.get(url);
        if (urlMetaCache) {
            return Promise.resolve(urlMetaCache.meta);
        }
    }

    return defaultExtInspector(url);
};

export type CardMeta = {
    url: string;
    title: string;
    image?: string | null;
    subtitle?: string | null;
    icon?: string | null;
    contentUrl?: string | null;
    contentType?: 'image' | 'video' | 'audio' | null;
    clickable?: string | null;
    provider?: string | null;
    webviewContent?: boolean | null;
};
