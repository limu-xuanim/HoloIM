import {useEffect, useState} from 'react';
import filesStore from '../../core/files/files-store';

/**
 * 传输中的文件数据对象 Hook
 * @param cgid 文件所属会话 GID
 * @returns 文件数据对象列表
 */
export default function useUploadingFiles(cgid: string) {
    const [uploadingFiles, setUploadingFiles] = useState(filesStore.getChatUploadingFiles(cgid));

    useEffect(() => {
        setUploadingFiles(filesStore.getChatUploadingFiles(cgid));
        return filesStore.unsubscribe.bind(
            filesStore,
            filesStore.subscribeAny(files => {
                if (files.some(x => x.cgid === cgid)) {
                    setUploadingFiles(filesStore.getChatUploadingFiles(cgid));
                }
            })
        );
    }, [cgid]);

    return uploadingFiles;
}
