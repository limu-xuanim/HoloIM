export type RGBA = {
    r: number;
    g: number;
    b: number;
    a: number;
};

export type RGBALike = Partial<RGBA>;

export type HSLA = {
    h: number;
    s: number;
    l: number;
    a: number;
};

export type HSLALike = Partial<HSLA>;

/**
 * 十六进制匹配正则表达式
 */
const hexReg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;

/**
 * 将指定数值大小修正为指定区间范围内
 * @param n 要修正的值
 * @param end 最大值
 * @param start 最大=小值
 * @return 修正后的值
 */
const fit = (n: number, end = 255, start = 0): number => Math.min(Math.max(n, start), end);

/**
 * 将指定数值修正为不超过给定的最大值
 * @param v 要修正的值
 * @param max 最大值
 * @return 修正后的值
 */
const clamp = (v: number, max?: number): number => fit(v, max);

/**
 * 将指定数值修正 RGB 分量取值范围，即 `0 <= x <= 256`
 * @param x 要修正的值
 * @return 修正后的值
 */
const convertToRgbInt = (x: number): number => Math.floor(clamp(x, 255));

/**
 * 将 16 进制颜色值字符串转换为 RGB 对象
 * @param hex 16 进制字符串
 * @return RGB 颜色对象
 */
export const hexToRgb = (hex: string): RGBA => {
    if (!hexReg.test(hex)) {
        throw new Error(`Wrong hex string! (hex: ${hex})`);
    }

    hex = hex.toLowerCase();
    if (hex.length === 4) {
        let hexNew = '#';
        for (let i = 1; i < 4; i++) {
            hexNew += hex.slice(i, i + 1).concat(hex.slice(i, i + 1));
        }
        hex = hexNew;
    }

    const hexChange = [];
    for (let i = 1; i < 7; i += 2) {
        hexChange.push(Number.parseInt(`0x${hex.slice(i, i + 2)}`, 16));
    }
    return {
        r: hexChange[0],
        g: hexChange[1],
        b: hexChange[2],
        a: 1
    };
};

/**
 * 判断一个字符串是否是颜色值的有效表示方式
 * @param hex 要判断的字符串
 * @return 如果为 `true` 则表示是有效的颜色值
 */
export const isColor = (hex: string): boolean => hex.toLowerCase() === 'transparent' || hexReg.test(hex.trim().toLowerCase());

/**
 * 将一个 hsl 颜色表示对象转换为 rgb 表示对象
 * @param hsl hsl 表示对象
 * @return RGB 颜色对象
 */
export const hslToRgb = (hsl: HSLA): RGBA => {
    const hue = (h: number): number => {
        h = h < 0 ? h + 1 : (h > 1 ? h - 1 : h);
        if (h * 6 < 1) {
            return m1 + ((m2 - m1) * h * 6);
        }
        if (h * 2 < 1) {
            return m2;
        }
        if (h * 3 < 2) {
            return m1 + ((m2 - m1) * ((2 / 3) - h) * 6);
        }
        return m1;
    };

    let {h, s, l, a} = hsl;

    h = (h % 360) / 360;
    s = clamp(s);
    l = clamp(l);
    a = clamp(a);

    const m2 = l <= 0.5 ? l * (s + 1) : (l + s - (l * s));
    const m1 = l * 2 - m2;

    const r = {
        r: hue(h + 1 / 3) * 255,
        g: hue(h) * 255,
        b: hue(h - 1 / 3) * 255,
        a
    };

    return r;
};

/**
 * 将数值转换为 16 进制形式，如果不足 2 位，则在字符串前面补充 0
 * @param x 要转换的数值
 * @return 16 机制颜色字符串
 */
const toHexValue = (x: number): string => {
    const xHex = x.toString(16);
    return xHex.length === 1 ? `0${xHex}` : xHex;
};

/**
 * 颜色类
 */
export class Color {
    private r: number;

    private g: number;

    private b: number;

    private a: number;

    /**
     * 创建一个颜色类实例
     * @param r 可以为 Red 通道值或者 hsla 对象或者 rgba 对象或者表示颜色的字符串
     * @param g Green 通道值
     * @param b Blue 通道值
     * @param a Alpha 通道值
     */
    constructor(r: number, g: number, b: number, a?: number);

    /**
     * 创建一个颜色实例
     * @param color 字符串格式颜色
     * @return 颜色对象
     */
    constructor(color: string);

    /**
     * 创建一个颜色实例
     * @param color rgba 格式颜色
     * @return 颜色对象
     */
    constructor(color: RGBALike);

    /**
     * 创建一个颜色实例
     * @param color hsla 格式颜色
     * @return 颜色对象
     */
    constructor(color: HSLALike);

    constructor(r: string|number|RGBALike|HSLALike, g?: number, b?: number, a = 1) {
        this.r = 0;
        this.g = 0;
        this.b = 0;
        this.A = a;

        if (typeof r === 'string') {
            const hex = r.toLowerCase();
            if (hex === 'transparent') {
                this.A = 0;
            } else {
                this.rgb = hexToRgb(hex);
            }
        } else if (typeof r === 'number') {
            this.R = r;
            this.G = g;
            this.B = b;
        } else if (typeof r === 'object') {
            const obj = (r as HSLALike);
            if (obj.h !== undefined) {
                const hsl = {
                    h: clamp(obj.h, 360),
                    s: 1,
                    l: 1,
                    a: this.A
                };
                if (obj.s !== undefined) hsl.s = clamp(obj.s, 1);
                if (obj.l !== undefined) hsl.l = clamp(obj.l, 1);
                if (obj.a !== undefined) hsl.a = clamp(obj.a, 1);
                this.rgb = hslToRgb(hsl);
            } else {
                this.rgb = (r as RGBALike);
            }
        }
    }

    static create(color: Color): Color;

    /**
     * 创建一个颜色实例
     * @param r 可以为 Red 通道值或者 hsla 对象或者 rgba 对象或者表示颜色的字符串
     * @param g Green 通道值
     * @param b Blue 通道值
     * @param a Alpha 通道值
     * @return 颜色对象
     */
    static create(r: number, g: number, b: number, a?: number): Color;

    /**
     * 创建一个颜色实例
     * @param color rgba 格式颜色
     * @return 颜色对象
     */
    static create(color: RGBALike): Color;

    /**
     * 创建一个颜色实例
     * @param color hsla 格式颜色
     * @return 颜色对象
     */
    static create(color: HSLALike): Color;

    /**
     * 创建一个颜色实例
     * @param color 字符串格式颜色
     * @return 颜色对象
     */
    static create(color: string): Color;

    static create(r: Color|RGBALike|HSLALike|string|number, g?: number, b?: number, a?: number) {
        if (r instanceof Color) {
            return r;
        }
        return new Color(r as any, g, b, a);
    }

    /**
     * 获取颜色以 RGB 格式表示的 Red 通道值
     */
    get R() {
        return this.r;
    }

    /**
     * 以 RGB 格式设置颜色 Red 通道值
     */
    set R(r: number) {
        this.r = convertToRgbInt(r);
    }

    /**
     * 获取颜色以 RGB 格式表示的 Green 通道值
     */
    get G() {
        return this.g;
    }

    /**
     * 以 RGB 格式设置颜色 Green 通道值
     */
    set G(g: number) {
        this.g = convertToRgbInt(g);
    }

    /**
     * 获取颜色以 RGB 格式表示的 Blue 通道值
     */
    get B() {
        return this.b;
    }

    /**
     * 以 RGB 格式设置颜色 Blue 通道值
     */
    set B(b: number) {
        this.b = convertToRgbInt(b);
    }

    /**
     * 获取颜色以 RGB 格式表示的 Alpha 通道值
     */
    get A() {
        return this.a;
    }

    /**
     * 以 RGB 格式设置颜色 Alpha 通道值
     */
    set A(a: number) {
        this.a = clamp(a, 1);
    }

    /**
     * 获取颜色以 RGB 格式表示的对象
     */
    get rbg(): RGBA {
        return {
            r: this.r,
            g: this.g,
            b: this.b,
            a: this.a
        };
    }

    /**
     * 使用 RGB 格式更新颜色值
     */
    set rgb(rgb: RGBALike) {
        if (rgb.r !== undefined) this.R = rgb.r;
        if (rgb.g !== undefined) this.G = rgb.g;
        if (rgb.b !== undefined) this.B = rgb.b;
        if (rgb.a !== undefined) this.A = rgb.a;
    }

    /**
     * 使用 RGB 格式更新颜色值
     * @param rgb RGB 颜色对象
     * @return 颜色对象
     */
    setRgb(rgb: RGBALike): Color {
        this.rgb = rgb;
        return this;
    }

    /**
     * 获取颜色以 HSL 形式表示的对象
     */
    get hsl(): HSLA {
        const r = this.r / 255;
        const g = this.g / 255;
        const b = this.b / 255;

        const a = this.a;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h: number;
        let s: number;
        const l = (max + min) / 2;
        const d = max - min;

        if (max === min) {
            h = s = 0;
        } else {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }
        return {
            h: h * 360,
            s,
            l,
            a
        };
    }

    /**
     * 使用 HSL 形式更新颜色值
     */
    set hsl(hsl: HSLA) {
        this.rgb = hslToRgb(hsl);
    }

    /**
     * 使用 HSL 形式更新颜色值
     * @param hsl HSL 颜色对象
     * @return 颜色对象
     */
    setHsl(hsl: HSLALike): Color {
        this.hsl = Object.assign(this.hsl, hsl);
        return this;
    }

    /**
     * 获取颜色以 HSL 格式表示的 Hue 通道值
     */
    get H() {
        return this.hsl.h;
    }

    /**
     * 以 HSL 格式设置颜色 Hue 通道值
     */
    set H(hue: number) {
        const {hsl} = this;
        hsl.h = clamp(hue, 360);
        this.hsl = hsl;
    }

    /**
     * 获取颜色以 HSL 格式表示的 Saturate 通道值
     */
    get S() {
        return this.hsl.s;
    }

    /**
     * 以 HSL 格式设置颜色 Saturate 通道值
     */
    set S(s: number) {
        const {hsl} = this;
        hsl.s = clamp(s, 1);
        this.hsl = hsl;
    }

    /**
     * 获取颜色以 HSL 格式表示的 Lightness 通道值
     */
    get L() {
        return this.hsl.l;
    }

    /**
     * 以 HSL 格式设置颜色 Lightness 通道值
     */
    set L(l: number) {
        const {hsl} = this;
        hsl.l = clamp(l, 1);
        this.hsl = hsl;
    }

    /**
     * 获取颜色在视觉上的亮度
     */
    get luma() {
        let r = this.r / 255;
        let g = this.g / 255;
        let b = this.b / 255;

        r = (r <= 0.03928) ? r / 12.92 : (((r + 0.055) / 1.055) ** 2.4);
        g = (g <= 0.03928) ? g / 12.92 : (((g + 0.055) / 1.055) ** 2.4);
        b = (b <= 0.03928) ? b / 12.92 : (((b + 0.055) / 1.055) ** 2.4);

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /**
     * 获取颜色以 16 进制表示的字符串
     */
    get hex() {
        return `#${toHexValue(this.r)}${toHexValue(this.g)}${toHexValue(this.b)}`;
    }

    /**
     * 获取颜色以 CSS 允许的形式表示的字符串
     */
    get css() {
        if (this.a > 0) {
            if (this.a < 1) {
                return `rgba(${this.r},${this.g},${this.b},${this.a})`;
            }
            return this.hex;
        }
        return 'transparent';
    }

    /**
     * 调整颜色使其变得更暗（或者更亮）
     * @param amount 0～100 表示的百分比，数值越大则越暗，如果设置为负数（-100~0）,则会使颜色变得更亮，数值越小则越亮
     * @returns 返回自身便于链式调用
     */
    darken(amount: number): Color {
        const {hsl} = this;

        hsl.l -= amount / 100;
        hsl.l = clamp(hsl.l, 1);

        this.hsl = hsl;
        return this;
    }

    /**
     * 调整颜色使其变得更亮（或者更暗）
     * @param amount 0～100 表示的百分比，数值越大则越亮，如果设置为负数（-100~0）,则会使颜色变得更暗，数值越小则越暗
     * @returns 返回自身便于链式调用
     */
    lighten(amount: number): Color {
        return this.darken(-amount);
    }

    /**
     * 根据百分比设置透明度
     * @param amount 0~100 表示的透明度百分比，0 为完全透明，100 为完全不透明
     * @returns 返回自身便于链式调用
     */
    fade(amount: number): Color {
        this.A = clamp(amount / 100, 1);
        return this;
    }

    /**
     * 在色环上进行旋转
     * @param amount 旋转的值
     * @return 返回自身便于链式调用
     */
    spin(amount: number): Color {
        const {hsl} = this;
        const hue = (hsl.h + amount) % 360;

        hsl.h = hue < 0 ? 360 + hue : hue;
        this.hsl = hsl;
        return this;
    }

    /**
     * 根据百分比调整色相值
     * @param amount 色相值 -100~100
     * @return 返回自身便于链式调用
     */
    saturate(amount: number): Color {
        const {hsl} = this;

        hsl.s += amount / 100;
        hsl.s = clamp(hsl.s);

        this.hsl = hsl;
        return this;
    }

    /**
     * 根据百分比调整亮度值
     * @param amount 亮度值 -100~100
     * @return 返回自身便于链式调用
     */
    lightness(amount: number): Color {
        const {hsl} = this;

        hsl.l += amount / 100;
        hsl.l = clamp(hsl.l);

        this.hsl = hsl;
        return this;
    }

    /**
     * 根据当前颜色亮度明暗程度返回一个对比色
     * @param dark 如果当前颜色为浅色，则返回此值指定的深色作为对比色，如果不指定则使用纯黑色
     * @param light 如果当前颜色为深色，则返回此值指定的浅色作为对比色，如果不指定则使用纯白色
     * @param threshold 判断是否为深色的阈值，可选范围 0～1
     * @return 返回自身便于链式调用
     */
    contrast(
        dark: string|Color = new Color(0, 0, 0, 1),
        light: string|Color = new Color(255, 255, 255, 1),
        threshold = 0.43
    ): Color {
        dark = Color.create(dark as any);
        light = Color.create(light as any);
        if (dark.luma > light.luma) {
            [light, dark] = [dark, light];
        }

        if (this.a < 0.5) {
            return dark;
        }

        if (this.isDark(threshold)) {
            return light;
        }
        return dark;
    }

    /**
     * 判断当前颜色是否为深色
     * @param threshold 判断是否为深色的阈值，可选范围 0～1
     * @return true 为深色
     */
    isDark(threshold = 0.43): boolean {
        return this.luma < threshold;
    }

    /**
     * 创建一个当前颜色实例的副本
     * @return 颜色对象
     */
    clone(): Color {
        return new Color(this.r, this.g, this.b, this.a);
    }
}

export default Color;
