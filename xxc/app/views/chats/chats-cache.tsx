import {memo, useCallback, useEffect, useState} from 'react';
import ErrorBoundary from '~/app/components/error-boundary';
import {classes} from '~/app/utils/html-helper';
import ChatView from './chat-view';
import {DEFAULT_CACHE_LIFE_TIME} from '~/app/core/im/chat-cache-info';
import Config from '~/app/config';
import {isChatsCacheChanged, getActivatedCacheChatsGID} from '~/app/core/im/im-ui';
import {getActiveChatGid, setActiveChat, activeNextChatOnMenu} from '~/app/core/im/chat-active-state';
import {isRoutePathMatch} from '~/app/core/ui/router';
import chatsStore from '~/app/core/im/chats-store';
import useLang from '../common/use-lang';
import {convertTimes} from '~/app/utils/string-helper';
import useForceUpdate from '~/app/components/hooks/use-force-update';
import {isNotEmptyArray} from '~/app/utils/check-empty';
import {setLocalConfig} from '~/app/core/local-config';

type ChatsCacheProps = Partial<{activeChatId: string;}>
    & React.HTMLAttributes<HTMLDivElement>;

/**
 * 聊天缓存管理容器组件
 * @param props React 组件属性对象
 * @returns JSX.Element
 */
function ChatsCache(props: ChatsCacheProps) {
    const {
        className,
        children = null,
        activeChatId,
    } = props;

    const [splitSize, setSplitSize] =  useState(0);
    const {forceUpdate} = useForceUpdate();
    const [Lang] = useLang();

    useEffect(() => {
        const timerID = setInterval(() => {
            if (isChatsCacheChanged()) {
                forceUpdate();
            }
        }, Math.floor(convertTimes(Config.ui['chat.cacheLife']) || DEFAULT_CACHE_LIFE_TIME / 2));
        return () => clearInterval(timerID);
    }, [forceUpdate]);

    useEffect(() => {
        if (Config.ui['chat.autoActiveNextChat'] && isRoutePathMatch('chats')) {
            if (!activeChatId || !chatsStore.getChat(activeChatId)) {
                activeNextChatOnMenu();
            } else if (activeChatId !== getActiveChatGid()) {
                setActiveChat(activeChatId);
            }
        }
    }, [activeChatId]);

    // TODO 待优化项
    const gidList = getActivatedCacheChatsGID(activeChatId);

    const onSplitSizeChange = useCallback((userID: number, newsize: number) => {
        if (!Config.ui['chat.sendbox.enableSyncSize']) {
            return;
        }
        setLocalConfig(`local.chat.sendbox.height.${userID}`, newsize);
        setSplitSize(newsize);
    }, []);

    return (
        <div className={classes('app-chats-cache', className)}>
            {
                isNotEmptyArray(gidList)
                    ? gidList
                        .filter(x => x)
                        .map(cgid => <ErrorBoundary key={cgid}><ChatView chatGid={cgid} hidden={activeChatId !== cgid} splitSize={splitSize} onSplitSizeChange={onSplitSizeChange} /></ErrorBoundary>)
                    : <div className="has-padding text-gray dock white">{Lang.string('chats.chat.selectOneOnMenu')}</div>
            }
            {children}
        </div>
    );
}

export default memo(ChatsCache);
