import {useState, useEffect} from 'react';
import chatsStore from '~/app/core/im/chats-store';
import useCurrentUser from '~/app/views/common/use-current-user';
import useLang from '~/app/views/common/use-lang';

const useRealChatName = (gid: string) => {
    const [name, setName] = useState('');
    const [Lang] = useLang();
    const [user] = useCurrentUser();
    useEffect(() => {
        const setChatName = (chat: Chat | Nullish) => {
            if (!chat) {
                return;
            }

            if (chat.isGroupOrSystem) {
                setName(chat.name);
                return;
            }
            if (chat.isPrivate) {
                setName(Lang.format('chat.name.one2one', user.displayName, user.displayName));
                return;
            }
            setName(Lang.format('chat.name.one2one', user.displayName, chat.name));
        }

        const chat = chatsStore.getChat(gid, false, true);
        setChatName(chat);

        return chatsStore.unsubscribe.bind(
            chatsStore,
            chatsStore.subscribe(gid, c => {
                setChatName(c);
            })
        );
    }, [gid, Lang.format, user]);
    return name;
};

export default useRealChatName
