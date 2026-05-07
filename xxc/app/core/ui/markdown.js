import marked from '../../utils/markdown';
import {emojiToImage} from '../../components/emoji';
import {linkMentionsInText} from '../im/chat-message-helper';

/**
 * 将 Markdown 渲染为 HTML
 * @param {string} content 要转换的 Markdown 文本
 * @param {Object} [options] 选项
 * @param {Object} [options.mentions=true] 是否处理 `@提及用户`
 * @param {Object} [options.emoji=true] 是否处理
 * @returns {string} 渲染后的 HTML
 */
export function renderMarkdown(content, options = {}) {
    const {mentions = true, emoji = true, ...markedOptions} = options;

    if (mentions) {
        content = linkMentionsInText(content);
    }

    content = marked.parse(content, markedOptions);

    if (emoji) {
        content = emojiToImage(content);
    }

    return content;
}
