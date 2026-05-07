import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Icon from '~/app/components/icon';
import Config from '~/app/config';
import {showContextMenu} from '~/app/core/context-menu';
import events from '~/app/core/events';
import {getOtherMemberInOne2OneChat} from '~/app/core/im/chat-helper';
import {updateChatSendboxStatus} from '~/app/core/im/im-chat-typing';
import {sendEmojiMessage, sendImageMessage, sendTextMessage} from '~/app/core/im/im-server';
import {emitChatSendboxFocus, onSendContentToChat} from '~/app/core/im/im-ui';
import {onActiveChat, setActiveChat} from '~/app/core/im/chat-active-state';
import {classes} from '~/app/utils/html-helper';
import ChatSendboxToolbar from './chat-sendbox-toolbar';
import chatsStore from '~/app/core/im/chats-store';
import TiptapEditor, {type TipTapEditorRef} from '~/app/components/tiptap-editor';
import type {EditorOptions, JSONContent} from '@tiptap/react';
import {base64ToFile, fileToBase64} from '~/app/utils/file-helper';
import {useAllUserConfig} from '../common/use-user-config';
import {isNotEmptyArray} from '~/app/utils/check-empty';
import membersStore from '~/app/core/members/members-store';
import {ChatMenuType} from '~/app/constants';
import useLang from '../common/use-lang';
import {showMessager} from '~/app/components/messager';

type ChatSendboxProps = {
    chat: Chat;
    className?: string;
    maxMentionSuggestionCount?: number;
};

/**
 * ChatSendbox 组件 ，显示一个聊天发送框
 */
export default memo(function ChatSendbox(props: ChatSendboxProps) {
    const {className, chat, maxMentionSuggestionCount = 20} = props;
    const [Lang] = useLang();
    const [sendButtonDisabled, setSendButtonDisabled] = useState(true);
    const editorRef = useRef<TipTapEditorRef>(null);
    const contentTextRef = useRef('');
    const userConfig = useAllUserConfig();
    const [placeholder, setPlaceholder] = useState(Lang.string('chat.sendbox.placeholder.sendMessage'));

    /**
     * 清空聊天发送框内的内容
     */
    const clearContent = useCallback(() => {
        editorRef.current?.clearContent();
        setSendButtonDisabled(true);
    }, []);

    /**
     * 激活发送框编辑器
     */
    const focusEditor = useCallback(() => {
        editorRef.current?.focus();
    }, []);

    /**
     * 以 JSON 形式获取编辑器内容
     */
    const getJSONContent = useCallback(() => {
        if (!editorRef.current) {
            return [];
        }

        const jsonContent = editorRef.current.getJSON();
        if (!jsonContent) {
            return [];
        }
        const contentList: JSONContent[] = [];
        handleContentJSON(jsonContent, contentList);
        return contentList;
    }, []);

    /**
     * 发送文本
     * @param textList 文本列表
     */
    const sendText = useCallback(async (textList: string[]) => {
        if (!isNotEmptyArray(textList) || !userConfig) {
            return;
        }
        const text = textList.join('');
        const trimContent = userConfig.sendHDEmoticon ? text.trim() : false;
        if (trimContent && joypixels.emojiList[trimContent]) {
            await sendEmojiMessage(trimContent, chat);
        } else {
            await sendTextMessage(text, chat);
        }
    }, [chat, userConfig?.sendHDEmoticon]);

    /**
     * 处理发送按钮点击事件
     */
    const handleSendButtonClick = useCallback(async () => {
        if (!editorRef.current || editorRef.current.isEmpty()) {
            return;
        }

        const contentList = getJSONContent();

        clearContent();
        focusEditor();
        setActiveChat(chat.gid, {menu: ChatMenuType.recents});

        const textList: string[] = [];
        let prevTypeIsText = false;
        for (const content of contentList) {
            if (content.type === 'image') {
                const src = content.attrs?.src;
                if (!src) {
                    continue;
                }

                const alt = content.attrs?.alt;
                const file = await base64ToFile(src, alt);
                await sendText(textList);
                await sendImageMessage(file, chat);
                textList.length = 0;
                prevTypeIsText = false;
                continue;
            }

            if (content.type === 'text' && content.text) {
                content.text = joypixels.toShort(content.text);
                if (prevTypeIsText) {
                    textList.push('\n');
                }
                textList.push(content.text);
                prevTypeIsText = true;
                continue;
            }

            if (content.type === 'mention' && content.attrs?.label) {
                textList.push(`@${content.attrs.label}`);
                prevTypeIsText = false;
                continue;
            }

            if (content.type === 'hardBreak') {
                textList.push('\n');
                prevTypeIsText = false;
            }
        }
        await sendText(textList);
    }, [chat, clearContent, focusEditor, getJSONContent, sendText]);

    const handleOnBlur: EditorOptions['onBlur'] = useCallback(({editor}) => {
        let draft = editor.getText();
        const jsonContent = getJSONContent();
        if (jsonContent?.[0]?.type === 'image') {
            draft = Lang.string('chat.message.type.image');
        }
        if (chat.draft !== draft) {
            chat.draft = draft;
            chat.lastAccessTime = Date.now();
            chatsStore.store(chat);
        }
    }, [Lang.string, getJSONContent, chat]);

    /**
     * 处理文本输入事件
     */
    const handleOnUpdate: EditorOptions['onUpdate'] = useCallback(({editor}) => {
        setSendButtonDisabled(editor.isEmpty);
        if (chat.isOne2One) {
            const lastContentText = editor.getText();
            if (lastContentText !== contentTextRef.current) {
                contentTextRef.current = lastContentText;
                updateChatSendboxStatus(chat, !editor.isEmpty);
            }
        }
    }, [chat.isOne2One, chat]);

    /**
     * 处理发送按钮右键菜单事件
     * @param event 事件对象
     */
    const handleSendBtnContextMenu = useCallback((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        showContextMenu('chat.sendbox.sendButton', {
            event,
            chat,
            options: {position: {direction: 'top-left'}},
        });
    }, [chat]);

    const handleOnFocus: EditorOptions['onFocus'] = useCallback(({editor}) => {
        emitChatSendboxFocus(chat, editor.getText());
    }, [chat]);

    /**
     * 向聊天发送框添加图片
     * @param images 要添加的图片
     */
    const appendImages = useCallback(async (images: File | File[]) => {
        if (!editorRef.current) {
            return;
        }

        if (!Array.isArray(images)) {
            images = [images];
        }

        for (const image of images) {
            const {base64, name} = await fileToBase64(image);
            editorRef.current.setImage(base64, name);
        }
    }, []);

    const handleOnPaste = useCallback(async (content: string | File[]) => {
        if (typeof content === 'string') {
            editorRef.current?.insertContent(content);
            return;
        }

        if (Array.isArray(content)) {
            for (const file of content) {
                if (file.type.includes('image/')) {
                    appendImages(file);
                    continue;
                }

                if (!window.nodeAPI) {
                    continue;
                }

                const isDir = await window.nodeAPI.fsIsDirectoryPromise(file.path);
                if (isDir) {
                    showMessager(Lang.string('error.UPLOAD_FOLDER_NOT_SUPPORTED'));
                    return;
                }
            }
        }
    }, [appendImages, chat.gid, Lang]);

    /**
     * 向聊天发送框添加 emoji
     * @param emoji 要添加的 emoji
     */
    const appendEmoji = useCallback((emoji: string) => {
        if (emoji) {
            editorRef.current?.insertContent(emoji);
        }
    }, []);

    const appendMention = useCallback((content: string) => {
        for (const name of content.split(',')) {
            editorRef.current?.insertContent(`<span class="text-accent" data-type="mention" data-id="${name}" data-label="${name}" contenteditable="false">@${name}</span> `);
        }
    }, []);

    useEffect(() => {
        const onSendContentToChatHandler = onSendContentToChat(chat.gid, options => {
            if (!options) {
                return;
            }

            const {content, type, send, clear} = options;

            if (clear) {
                clearContent();
            }
            if (content) {
                if (type === 'image') {
                    appendImages(content as File);
                } else if (type === 'emoji') {
                    appendEmoji(content as string);
                } else if (type === 'mention') {
                    appendMention(content as string);
                } else {
                    editorRef.current?.insertContent(content as string);
                }
            }
            focusEditor();
            if (send) {
                handleSendButtonClick();
            }
        });

        return () => {
            events.off(onSendContentToChatHandler);
        };
    }, [chat.gid, clearContent, focusEditor, handleSendButtonClick, appendEmoji, appendImages, appendMention]);

    useEffect(() => {
        if (!Config.ui['chat.sendbox.focusOnActiveChat']) {
            return;
        }

        const onChatActiveHandler = onActiveChat(activeChatGid => {
            if (chat.gid === activeChatGid) {
                focusEditor();
            }
        });

        focusEditor();

        return () => events.off(onChatActiveHandler)
    }, [chat.gid, focusEditor]);

    useEffect(() => {
        if (!chat.isOne2One) {
            return;
        }

        const updatePlaceholder = (member: Member | Nullish) => {
            if (!member) {
                return;
            }

            if (member.isOffline) {
                setPlaceholder(Lang.format('chat.sendbox.placeholder.memberIsOffline', member.displayName));
                return;
            }
            if (member.isBusy || member.isAway) {
                setPlaceholder(Lang.format('chat.sendbox.placeholder.memberIsBusy', member.displayName, Lang.string(`member.status.${member.statusName}`)));
            }

            setPlaceholder(Lang.string('chat.sendbox.placeholder.sendMessage'));
        };

        const member = getOtherMemberInOne2OneChat(chat);
        updatePlaceholder(member);
        // 需要根据用户状态更新一对一会话输入框 placeholder
        const onMemberChangeHandler = membersStore.subscribe(chat.theOtherMemberID, (m: Member) => {
            updatePlaceholder(m);
        });

        return () => events.off(onMemberChangeHandler);
    }, [chat, Lang.name, Lang.format, Lang.string]);

    useEffect(() => {
        if (!chat.isOne2One) {
            setPlaceholder(Lang.string('chat.sendbox.placeholder.sendMessage'));
        }
    }, [Lang.name, Lang.string, chat.isGroupOrSystem]);

    const sendButton = useMemo(() =>(
        <button
            type="button"
            className="app-chat-sendbox-send-btn btn iconbutton -rounded hint--top-right dock dock-bottom dock-right"
            data-hint={`${Lang.string('chat.sendbox.toolbar.send')} (${userConfig?.sendMessageHotkey} - ${Lang.string('chat.sendbox.toolbar.changeHotkeyTip')})`}
            onClick={handleSendButtonClick}
            onContextMenu={handleSendBtnContextMenu}
        >
            <Icon
                className={classes('icon-2x', {
                    muted: sendButtonDisabled,
                    'text-primary': !sendButtonDisabled
                })}
                name="mdi-keyboard-return"
            />
        </button>
    ), [Lang.string, handleSendBtnContextMenu, handleSendButtonClick, sendButtonDisabled, userConfig?.sendMessageHotkey]);

    return (
        <div className={classes('app-chat-sendbox', className)}>
            <ChatSendboxToolbar
                className="-absolute -left-0 -right-0 -top-0 -bottom-auto"
                chat={chat}
                sendButtonDisabled={sendButtonDisabled}
            />
            <TiptapEditor
                ref={editorRef}
                slotAfter={sendButton}
                className="app-chat-tiptapeditor white dock-bottom -overflow-y-auto scrollbar-hover"
                placeholder={placeholder}
                showPlaceholder={sendButtonDisabled}
                onFocus={handleOnFocus}
                onBlur={handleOnBlur}
                onUpdate={handleOnUpdate}
                handleSendButtonClick={handleSendButtonClick}
                sendShortcut={userConfig?.sendMessageHotkey}
                chat={chat}
                maxMentionSuggestionCount={maxMentionSuggestionCount}
                onPaste={handleOnPaste}
            />
        </div>
    );
});

/**
 * 扁平化获取到的 JSONContent
 * @param json jsonContent
 * @param result 结果
 */
function handleContentJSON(json: JSONContent, result: JSONContent[]) {
    if (!Array.isArray(json.content)) {
        result.push(json);
        return;
    }

    if (json.content.length === 0 && json.type === 'paragraph') {
        // 处理空段落（代表空行），添加 hardBreak 来保留空行
        result.push({type: 'hardBreak'});
        return;
    }

    for (const c of json.content) {
        if (Array.isArray(c.content)) {
            handleContentJSON(c, result);
        } else {
            result.push(c);
        }
    }

    return;
}
