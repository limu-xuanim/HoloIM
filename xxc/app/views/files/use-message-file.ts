import {useEffect} from 'react';
import useForceUpdate from '~/app/components/hooks/use-force-update';
import {FilesStoreModule} from '~/app/entries/vars/FilesStoreModule'

const {default: filesStore} = FilesStoreModule;

/**
 * 文件数据对象 Hook
 * @param messageOrID 消息对象或 ID
 * @returns 文件数据对象
 */
export default function useMessageFile(messageOrID: ChatMessage|number) {
    const messageFile = filesStore.getMessageFile(messageOrID);
    const {gid} = messageFile;
    const {forceUpdate} = useForceUpdate();

    useEffect(() => filesStore.unsubscribe.bind(
        filesStore,
        filesStore.subscribe(gid, () => {
            forceUpdate();
        })
    ), [gid]);

    return messageFile;
}
