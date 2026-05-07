import {useEffect, useState} from 'react';
import filesStore, {getFileData} from '../../core/files/files-store';

/**
 * 文件数据对象 Hook
 * @param gid 文件 GID
 * @param initialFile 初始文件对象
 * @returns 文件数据对象
 */
export default function useFile(gid: string, initialFile = filesStore.getFile(gid)) {
    const [fileKeeper, setFileKeeper] = useState([getFileData(initialFile)]);

    useEffect(() => {
        setFileKeeper([filesStore.getFile(gid)]);
        return filesStore.unsubscribe.bind(
            filesStore,
            filesStore.subscribe(gid, file => setFileKeeper([file]))
        );
    }, [gid]);

    return fileKeeper[0];
}
