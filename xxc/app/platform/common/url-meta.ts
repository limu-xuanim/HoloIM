import {getTextFromResponse} from '~/app/platform/common/network';
import {limitTimePromise} from '~/app/utils/promise';

/** 网址解析类 */
class UrlMeta {
    /** 要解析的网址 */
    public readonly url: string;

    /** 要解析的网址根地址 */
    public readonly rootUrl: string;

    private contentType: string;

    private doc: Document;

    /** 网页标题缓存 */
    #title: string;

    /** 网页标题缓存 */
    #ogTitle: string;

    /** 网页标题缓存 */
    #ogDescription: string;

    /**  OG 类型缓存 */
    #ogType: string;

    /** 网页更新时间缓存 */
    #ogUpdatedTime: string;

    /** 本地化名称缓存 */
    #ogLocale: string;

    /** 链接缓存 */
    #links: string[];

    /** Meta 描述缓存 */
    #metaDescription: string;

    /** 次要描述缓存 */
    #secondaryDescription: string;

    /** 关键字缓存 */
    #keywords: string[];

    /** 作者缓存 */
    #author: string;

    /** 网页编码缓存 */
    #charset: string;

    /** 图片缓存 */
    #image: string;

    /** Feeds 地址缓存 */
    #feeds: string[];

    /**
     * Favicons 缓存
     */
    #favicons: Array<{href: string; sizes: string;}>;

    /**
     * 创建一个网址解析类实例
     * @param url 要解析的网址
     */
    constructor(url: string) {
        const parsedUrl = new URL(url);
        this.url = url;
        this.rootUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    }

    /**
     * 根据给定的 Fetch 响应数据解析网址信息
     * @param response Fetch 响应数据
     * @param controller Fetch 控制对象
     * @returns 使用 Promise 异步返回处理结果
     */
    async inspectFromResponse(response: Response, controller: AbortController): Promise<UrlMetaPlain> {
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        if (contentType.startsWith('image')) {
            this.contentType = 'image';
            if (controller) {
                controller.abort();
            }
        } else if (contentType.startsWith('video')) {
            this.contentType = 'video';
            if (controller) {
                controller.abort();
            }
        } else if (contentType.startsWith('audio')) {
            this.contentType = 'audio';
            if (controller) {
                controller.abort();
            }
        } else if (contentType.startsWith('text')) {
            this.contentType = 'page';
            const documentSource = await getTextFromResponse(response);
            const parser = new DOMParser();
            this.doc = parser.parseFromString(documentSource, contentType.split(';')[0].trim() as DOMParserSupportedType);
            return Promise.resolve(this.toPlain());
        } else if (controller) {
            controller.abort();
        }
        return Promise.resolve(this.toPlain());
    }

    /** 获取当前网址是否是普通网页 */
    get isPage() {
        return this.contentType === 'page';
    }

    /** 获取当前网址是否是图片 */
    get isImage() {
        return this.contentType === 'image';
    }

    /** 获取当前网址是否是视频 */
    get isVideo() {
        return this.contentType === 'video';
    }

    /** 获取当前网址是否是音频 */
    get isAudio() {
        return this.contentType === 'audio';
    }

    /** 获取网页标题 */
    get title() {
        if (!this.isPage) {
            return this.url;
        }
        if (this.#title === undefined) {
            this.#title = this.doc.querySelector<HTMLTitleElement>('head > title')?.innerText;
        }
        return this.#title;
    }

    /**
     * 获取网页标题
     */
    get ogTitle() {
        if (!this.isPage) {
            return this.url;
        }
        if (this.#ogTitle === undefined) {
            this.#ogTitle = this.doc.querySelector<HTMLMetaElement>("meta[property='og:title']")?.getAttribute('content');
        }
        return this.#ogTitle;
    }

    /**
     * 获取网页标题
     */
    get ogDescription() {
        if (!this.isPage) {
            return '';
        }
        if (this.#ogDescription === undefined) {
            this.#ogDescription = this.doc.querySelector<HTMLMetaElement>("meta[property='og:description']")?.getAttribute('content');
        }
        return this.#ogDescription;
    }

    /**
     * 获取 OG 类型
     */
    get ogType() {
        if (this.#ogType === undefined) {
            this.#ogType = this.doc.querySelector<HTMLMetaElement>("meta[property='og:type']")?.getAttribute('content');
        }
        return this.#ogType;
    }

    /**
     * 获取网页更新时间
     */
    get ogUpdatedTime() {
        if (this.#ogUpdatedTime === undefined) {
            this.#ogUpdatedTime = this.doc.querySelector<HTMLMetaElement>("meta[property='og:updated_time']")?.getAttribute('content');
        }
        return this.#ogUpdatedTime;
    }

    /**
     * 获取本地化名称
     */
    get ogLocale() {
        if (this.#ogLocale === undefined) {
            this.#ogLocale = this.doc.querySelector<HTMLMetaElement>("meta[property='og:locale']")?.getAttribute('content');
        }
        return this.#ogLocale;
    }

    /**
     * 获取链接
     */
    get links() {
        if (this.#links === undefined) {
            this.#links = [];
            for (const elem of this.doc.querySelectorAll('a')) {
                if (elem.href) {
                    this.#links.push(elem.href);
                }
            }
        }
        return this.#links;
    }

    /**
     * 获取 Meta 描述
     */
    get metaDescription() {
        if (this.#metaDescription === undefined) {
            this.#metaDescription = this.doc.querySelector<HTMLMetaElement>("meta[name='metaDescription']")?.getAttribute('content');
        }
        return this.#metaDescription;
    }

    /**
     * 获取次要描述
     */
    get secondaryDescription() {
        if (this.#secondaryDescription === undefined) {
            this.#secondaryDescription = null;
            for (const elem of this.doc.querySelectorAll('p')) {
                const text = elem.innerText;

                // If we found a paragraph with more than
                if (text.length >= 120) {
                    this.#secondaryDescription = text;
                    break;
                }
            }
        }
        return this.#secondaryDescription;
    }

    /**
     * 获取网页描述
     */
    get description() {
        if (!this.isPage) {
            return '';
        }
        return this.metaDescription || this.secondaryDescription || this.ogDescription;
    }

    /**
     * 获取关键字
     */
    get keywords() {
        if (this.#keywords === undefined) {
            const keywordsString = this.doc.querySelector<HTMLMetaElement>("meta[name='keywords']")?.getAttribute('content');

            if (keywordsString) {
                this.#keywords = keywordsString.split(',');
            } else {
                this.#keywords = [];
            }
        }
        return this.#keywords;
    }

    /**
     * 获取作者
     */
    get author() {
        if (this.#author === undefined) {
            this.#author = this.doc.querySelector<HTMLMetaElement>("meta[name='author']")?.getAttribute('content');
        }
        return this.#author;
    }

    /**
     * 获取网页编码
     */
    get charset() {
        if (this.#charset === undefined) {
            this.#charset = this.doc.querySelector<HTMLMetaElement>('meta[charset]')?.getAttribute('charset');
        }
        return this.#charset;
    }

    /**
     * 获取图片
     */
    get image() {
        if (!this.isPage) {
            return null;
        }
        if (this.#image === undefined) {
            const img = this.doc.querySelector<HTMLMetaElement>("meta[property='og:image']")?.getAttribute('content');
            if (img) {
                this.#image = this.getAbsolutePath(img);
            } else {
                this.#image = null;
            }
        }
        return this.#image;
    }

    /**
     * 获取Feeds 地址
     */
    get feeds() {
        if (this.#feeds === undefined) {
            this.#feeds = this.parseFeeds('rss') || this.parseFeeds('atom');
        }
        return this.#feeds;
    }

    /**
     * 获取 Favicons
     */
    get favicons() {
        if (this.#favicons === undefined) {
            this.#favicons = this.parseFavicons('shortcut icon').concat(
                this.parseFavicons('icon'),
                this.parseFavicons('apple-touch-icon'),
            );
        }
        return this.#favicons;
    }

    /**
     * 获取首要 Favicon
     */
    get favicon() {
        return this.favicons[0];
    }

    /**
     * 提取 Feeds 地址
     * @param format Feeds 格式
     * @returns Feeds 地址列表
     */
    parseFeeds(format: string): string[] {
        const feeds: string[] = [];
        for (const elem of this.doc.querySelectorAll<HTMLLinkElement>(`link[type='application/${format}+xml']`)) {
            if (elem.href) {
                feeds.push(elem.href);
            }
        }

        return feeds;
    }

    /**
     * 获取绝对地址
     * @param href 路径
     * @returns 绝对地址
     */
    getAbsolutePath(href: string): string {
        if ((/^(http:|https:)?\/\//i).test(href)) {
            return href;
        }
        if (!(/^\//).test(href)) {
            href = `/${href}`;
        }
        return this.rootUrl + href;
    }

    /**
     * 提取 Favicons 地址
     *
     * @param format 格式
     * @returns Favicons 地址
     */
    parseFavicons(format: string) {
        if (format === 'favicon.ico') {
            return [{
                href: this.getAbsolutePath('favicon.ico'),
                sizes: '',
            }];
        }
        if (!this.isPage) {
            return [];
        }
        return Array.from(this.doc.querySelectorAll<HTMLLinkElement>(`link[rel='${format}']`))
            .map(elem => {
                // @ts-ignore
                const href = elem.attributes.href?.value || '';
                const sizes = elem.sizes?.toString();
                return {
                    href: this.getAbsolutePath(href),
                    sizes: sizes || ''
                };
            })
    }

    toPlain() {
        const {
            isPage,
            isImage,
            isVideo,
            isAudio,
            title,
            ogTitle,
            ogDescription,
            ogType,
            ogUpdatedTime,
            ogLocale,
            links,
            metaDescription,
            secondaryDescription,
            description,
            keywords,
            author,
            charset,
            image,
            feeds,
            favicons,
            favicon,
        } = this;

        return {
            isPage,
            isImage,
            isVideo,
            isAudio,
            title,
            ogTitle,
            ogDescription,
            ogType,
            ogUpdatedTime,
            ogLocale,
            links,
            metaDescription,
            secondaryDescription,
            description,
            keywords,
            author,
            charset,
            image,
            feeds,
            favicons,
            favicon,
        };
    }
}

export type UrlMetaPlain = ReturnType<UrlMeta['toPlain']>;

/**
 * 解析网页地址所指向的页面信息
 * @param url 网页地址
 * @returns 页面信息
 */
export default async function getUrlMeta(url: string) {
    const controller = new AbortController();
    try {
        const response = await limitTimePromise<Response>(fetch(url, {signal: controller.signal}), 5000);
        return new UrlMeta(url).inspectFromResponse(response, controller);
    } catch (error) {
        console.error(error);
    }
}
