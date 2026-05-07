import {emojiToImage} from './emoji';

type EmojiIconProps = {name: string}
    & React.HTMLAttributes<HTMLDivElement>;

/**
 * EmojiIcon 组件 ，显示 Emoji 表情图标
 * @returns JSX.Element
 */
function EmojiIcon(props: EmojiIconProps) {
    const {name, ...other} = props;
    // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
    return <div {...other} dangerouslySetInnerHTML={{__html: emojiToImage(name)}} />;
}

export default EmojiIcon;
