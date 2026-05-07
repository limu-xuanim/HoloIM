import {useEffect, useRef, useState} from 'react';
import Button from '~/app/components/button';
import {type CardMeta, getUrlMeta} from '~/app/core/ui/url-meta';
import MessageCard, {type MessageCardProps} from './message-card';
import useLang from '../common/use-lang';

type MessageContentUrlProps = Omit<MessageCardProps, 'header'|'card'|'fluidWidth'>
    & {message: ChatMessage; sleep?: boolean;};

async function isDownloadUrl(url: string) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentType = response.headers.get('Content-Type');
        return contentType?.startsWith('application/');
    } catch (error) {
        return false;
    }
}

/**
 * MessageContentUrl 组件 ，显示聊天消息网址卡片内容界面
 */
export default function MessageContentUrl(props: MessageContentUrlProps) {
    const {
        sleep = false,
        message,
        className,
        ...others
    } = props;
    const [Lang] = useLang();
    const {objectContent} = message;
    const url = objectContent.url;
    const [meta, setMeta] = useState<CardMeta>({url, title: url});
    const [loading, setLoading] = useState(false);
    const unmountedRef = useRef(false);

    useEffect(() => {
        if (sleep === false) {
            getCurrentUrlMeta();
        }
    }, [sleep]);

    useEffect(() => {
        return () => {
            unmountedRef.current = true;
        };
    }, []);

    /**
     * 获取卡片最大适合宽度（填充满窗口消息列表可用区域）
     */
    const getFluidCardWidth = () => {
        const {cgid} = message;
        const messageListElement = document.querySelector(cgid ? `#chat-view-${cgid.replace('&', '_')} .app-message-list` : '.app-chats .app-chat:not(.hidden) .app-message-list');
        if (messageListElement) {
            return messageListElement.clientWidth - 80;
        }
        return 0;
    };

    /**
     * 获取网址信息
     * @param disableCache 是否禁用缓存
     */
    const getCurrentUrlMeta = async (disableCache = false) => {
        setLoading(true);
        try {
            const thisMeta = await getUrlMeta(url, disableCache);
            if (thisMeta.webviewContent) {
                const result = await isDownloadUrl(url);
                if (result) {
                    thisMeta.webviewContent = false;
                }
            }
            if (unmountedRef.current) {
                return;
            }
            setMeta(thisMeta)
            setLoading(false);
        } catch (error) {
            if (unmountedRef.current) {
                return;
            }
            if (DEBUG) {
                console.error('Get url meta error', error);
            }
            setMeta({url, title: url});
            setLoading(false);
        }
    };

    const header = loading
        ? (
            <div className="-flex-none has-padding-sm center-content">
                <Button
                    disabled
                    className="iconbutton -rounded text-accent hint--bottom-right"
                    data-hint={Lang.string('chat.message.loadCard')}
                    icon="mdi-loading muted spin"
                />
            </div>
        )
        : meta
            ? null
            : (
                <div className="-flex-none has-padding-sm center-content">
                    <Button
                        onClick={() => getCurrentUrlMeta(true)}
                        className="iconbutton -rounded text-accent hint--bottom-right"
                        data-hint={Lang.string('chat.message.loadCard')}
                        icon="mdi-cards-playing-outline"
                    />
                </div>
            );

    return (
        <MessageCard
            header={header}
            card={meta}
            fluidWidth={getFluidCardWidth}
            className="app-message-content-url -relative"
            {...others}
        />
    );
}
