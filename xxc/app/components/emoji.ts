import Config from '../config';

/**
 * 设置 EmojiToolkit 图片资源路径
 */
joypixels.imagePathPNG = Config.media['emoji.imagePathPNG'];

/**
 * 设置 EmojiToolkit 图片资源类型
 */
joypixels.imageType = Config.media['emoji.imageType'];

/**
 * 将字符串中的表情缩略语转化为为 HTML 图片标签形式
 * @param str 要转换的字符串
 * @returns 转换后的字符串
 */
export function emojiToImage(str: string): string {
    const ipv6List: string[] = []; // 存储字符串中出现的所有 IPv6 地址
    const macList: string[] = []; // 存储字符串中出现的所有 MAC 地址

    // 先预先处理所有 ipv6 地址和 MAC 地址
    str = str
        .replace(/([\da-fA-F]{1,4}:){7}([\da-fA-F]{1,4})/gi, (ipv6) => {
            ipv6List.push(ipv6);
            return `{{IPV6_${ipv6List.length - 1}}}`;
        })
        .replace(/(([a-fA-F0-9]{2}[-:]){5}[a-fA-F0-9]{2})|(([a-fA-F0-9]{4}\.){2}[a-fA-F0-9]{4})/gi, (mac) => {
            macList.push(mac);
            return `{{MAC_${macList.length - 1}}}`;
        });

    // 处理表情
    str = joypixels[Config.ui['chat.useNativeEmoji'] ? 'shortnameToUnicode' : 'toImage'](str);

    // 还原ipv6 地址
    if (ipv6List.length) {
        str = str.replace(/\{\{IPV6_(\d+)\}\}/g, (_, index) => ipv6List[index]);
    }

    // 还原 MAC 地址
    if (macList.length) {
        str = str.replace(/\{\{MAC_(\d+)\}\}/g, (_, index) => macList[index]);
    }

    return str;
}

/**
 * 编码包含 emoji 的消息
 * @param message 包含 emoji 的消息
 * @returns 编码后的消息
 */
export function encodeEmojiMessage(message: string): string {
    const emojiReg = /\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji}\uFE0F/gu;
    if (!emojiReg.test(message)) {
        return message;
    }

    message = message.replace(emojiReg, (match) => `^XUAN_EMOJI${match}$`);
    return joypixels.toShort(message);
}

/**
 * 解码包含 emoji 编码的消息
 * @param message 包含 emoji 编码的消息
 * @returns 解码后的消息
 */
export function decodeEmojiMessage(message: string): string {
    const matchArr = message.match(/\^XUAN_EMOJI([^$]+)\$/);
    if (matchArr === null || !joypixels.emojiList[matchArr?.[1]]) {
        return message;
    }

    return message.replace(/\^XUAN_EMOJI([^$]+)\$/g, (_, p1) => joypixels.shortnameToUnicode(p1));
}

/**
 * 从 joypixels 数据中匹配 emoji，用于在输入框中插入 emoji
 * @param emoji emoji 对象，可能来自于 emojione 或者 emoji-mart
 * @returns emoji 字符串
 */
export function convertEmojiToString(emoji: any): string {
    const emojiID = emoji.shortname || `:${emoji.id}:`;
    emoji = joypixels.emojiList[emojiID] || Object.values(joypixels.emojiList).find(em => (em as any).shortnames?.includes(emojiID));

    if (emoji.shortname) {
        return joypixels.shortnameToUnicode(emoji.shortname);
    }
    if (emoji.uc_full) {
        return joypixels.convert(emoji.uc_full);
    }
    if (emoji.unicode) {
        return joypixels.convert(emoji.unicode);
    }
    return '';
}

export default joypixels;
