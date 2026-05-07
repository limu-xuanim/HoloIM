import Color, {isColor} from './color';
import type {HSLALike, RGBALike} from './color';

/**
 * 默认皮肤选项
 */
const DEFAULT_OPTIONS = {
    outline: false,
    pale: false,
    dark: false,
    code: 'random',
    textTint: true,
    backTint: true,
    textColor: '',
    darkText: '#fff',
    lightText: '#333',
    hueSpace: 43,
    threshold: 0.43,
    darkLight: 0.4,
    paleLight: 0.92,
    saturation: 0.7,
    lightness: 0.6,
    longShadow: false as const,
};

/**
 * 根据给定字符串获取一个对应的唯一的固定值
 * @param str 要计算值的字符串
 * @returns 该字符串对应的数值
 */
export const getCodeFromString = (str: string) => {
    if (!str) {
        return 0;
    }
    return str
        .split('')
        .map((char) => char.charCodeAt(0))
        .reduce((current, previous) => previous + current);
};

/**
 * 计算长阴影样式
 * @param shadowSize 阴影大小
 * @param color 阴影颜色
 * @param returnShadow 是否返回阴影值，如果为 `false` 则返回样式对象
 * @param darkenAmount 阴影色彩加深百分比
 * @returns 长阴影样式
 */
export function longShadow(
    shadowSize: number,
    color: Color | RGBALike | HSLALike | string,
    returnShadow: true,
    darkenAmount?: number,
): string;

/**
 * 计算长阴影样式
 * @param shadowSize 阴影大小
 * @param color 阴影颜色
 * @param returnShadow 是否返回阴影值，如果为 `false` 则返回样式对象
 * @param darkenAmount 阴影色彩加深百分比
 * @returns 长阴影样式
 */
export function longShadow(
    shadowSize: number,
    color: Color | RGBALike | HSLALike | string,
    returnShadow: false,
    darkenAmount?: number,
): {textShadow: string};

/**
 * 计算长阴影样式
 * @param shadowSize 阴影大小
 * @param color 阴影颜色
 * @param returnShadow 是否返回阴影值，如果为 `false` 则返回样式对象
 * @param darkenAmount 阴影色彩加深百分比
 * @returns 长阴影样式
 */
export function longShadow(
    shadowSize: number,
    color: Color | RGBALike | HSLALike | string,
    returnShadow = false,
    darkenAmount = 8,
) {
    if (typeof shadowSize !== 'number') {
        shadowSize = 40;
    }
    const shadowColor = Color.create(color as Color).darken(darkenAmount).css;
    const textShadowArr = [];
    for (let i = 1; i <= shadowSize; ++i) {
        textShadowArr.push(`${shadowColor} ${i}px ${i}px`);
    }
    const textShadow = textShadowArr.join(',');
    return returnShadow ? textShadow : {textShadow};
}

export type SkinStyleOptions = Partial<{
    color: Color | string;
    textColor: Color | string;
    code: string | number | HSLALike;
    saturation: number;
    outline: boolean;
    pale: boolean;
    dark: boolean;
    textTint: boolean;
    backTint: boolean;
    darkText: string;
    lightText: string;
    hueSpace: number;
    threshold: number;
    darkLight: number;
    paleLight: number;
    lightness: number;
    name: string;
    longShadow: false | number;
}>;

export function skinStyle(skinCode: string | number, options?: SkinStyleOptions): React.CSSProperties;

export function skinStyle(options?: SkinStyleOptions): React.CSSProperties;

/**
 * 根据值或配置对象生成 CSS 样式对象
 * @param skinCode 皮肤值
 * @param options 皮肤配置对象
 * @returns CSS 样式对象
 */
export function skinStyle(skinCode: SkinStyleOptions | string | number, options: SkinStyleOptions = {}) {
    if (typeof skinCode === 'object') {
        options = skinCode;
    } else {
        options.code = skinCode;
    }
    options = {...DEFAULT_OPTIONS, ...options};


    let {
        outline,
        pale,
        dark,
        textTint,
        backTint,
        darkText,
        lightText,
        color,
        code,
        textColor,
        hueSpace,
        threshold,
        darkLight,
        paleLight,
        saturation,
        lightness,
        name,
        longShadow: thisLongShadow,
        ...other
    } = options;

    if (!color) {
        if (code === 'random') {
            code = Math.floor(Math.random() * 360);
            color = generateColorFromNumber(code, hueSpace, saturation, lightness);
        } else if (typeof code === 'string') {
            if (!isColor(code)) {
                color = generateColorFromString(code, hueSpace, saturation, lightness);
            } else {
                color = code;
            }
        } else if (typeof code === 'number') {
            color = generateColorFromNumber(code, hueSpace, saturation, lightness);
        }
    }
    color = Color.create(color as string);

    let backColor: Color;
    let borderColor: Color;
    let fontColor = textColor;
    if (outline) {
        if (dark) {
            const darkColor = color.clone().setHsl({s: saturation, l: darkLight});
            borderColor = darkColor;
        } else if (pale) {
            const lightColor = color.clone().setHsl({s: saturation, l: paleLight});
            borderColor = lightColor;
        } else {
            borderColor = color;
        }
        if (!fontColor && textTint) {
            fontColor = borderColor;
        }
    } else if (backTint) {
        if (dark) {
            const darkColor = color.clone().setHsl({s: saturation, l: darkLight});
            backColor = darkColor;
        } else if (pale) {
            const lightColor = color.clone().setHsl({s: saturation, l: paleLight});
            backColor = lightColor;
        } else {
            backColor = color;
        }
        if (!fontColor) {
            if (backColor.isDark(threshold)) {
                fontColor = darkText;
            } else if (textTint) {
                const darkColor = color.clone().setHsl({s: saturation, l: darkLight});
                fontColor = darkColor;
            } else {
                fontColor = lightText;
            }
        }
    } else if (dark) {
        const darkColor = color.clone().setHsl({s: saturation, l: darkLight});
        fontColor = darkColor;
    } else if (pale) {
        const lightColor = color.clone().setHsl({s: saturation, l: paleLight});
        fontColor = lightColor;
    } else {
        fontColor = color;
    }

    const style: React.CSSProperties = {...other};
    if (backColor) {
        style.backgroundColor = backColor.css;
    }
    if (borderColor) {
        style.borderColor = borderColor.css;
    }
    if (fontColor) {
        style.color = typeof fontColor === 'string' ? fontColor : fontColor.css;
    }
    if (thisLongShadow) {
        style.textShadow = longShadow(thisLongShadow, backColor, true);
    }
    return style;
}

export function generateColorFromString(
    str: string,
    initHue = DEFAULT_OPTIONS.hueSpace,
    saturation = DEFAULT_OPTIONS.saturation,
    lightness = DEFAULT_OPTIONS.lightness,
) {
    return generateColorFromNumber(getCodeFromString(str), initHue, saturation, lightness);
}

/**
 * 根据数值生成一个颜色对象
 * @param num
 * @param initHue
 * @param saturation
 * @param lightness
 */
export function generateColorFromNumber(
    num: number,
    initHue = DEFAULT_OPTIONS.hueSpace,
    saturation = DEFAULT_OPTIONS.saturation,
    lightness = DEFAULT_OPTIONS.lightness,
) {
    return Color.create({
        h: (num * initHue) % 360,
        s: saturation,
        l: lightness,
    });
}

export default {
    style: skinStyle,
    longShadow,
};
