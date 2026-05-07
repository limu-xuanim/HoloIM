import * as clipboard from 'clipboard-polyfill'; // 考虑升级到 https://github.com/lgarron/clipboard-polyfill

/**
 * 将文本复制到剪切板
 * @param text 要复制的文本
 */
export const {writeText} = clipboard;

/**
 * 将 HTML 文本复制到剪切板
 * @param html 要复制的 HTML 文本
 */
export const writeHTML = (html: string) => {
    const citem = new clipboard.ClipboardItem({
        'text/html': new Blob(
            [html],
            {type: 'text/html'}
        ),
    });
    clipboard.write([citem]);
};

/**
 * 将内容写入剪切板中
 * @param data 内容
 */
export const write = (data: {text: string; html: string;}): void => {
    const items: Record<string, clipboard.ClipboardItemDataType> = {};
    if (data.html !== undefined) {
        items['text/html'] = new Blob(
            [data.html],
            {type: 'text/html'}
        );
    }
    if (data.text !== undefined) {
        items['text/plain'] = new Blob(
            [data.text],
            {type: 'text/plain'}
        );
    }
    const citem = new clipboard.ClipboardItem(items);
    clipboard.write([citem]);
};

const clipboardModule = {
    write,
    writeText,
    writeHTML,
};

export default clipboardModule;
