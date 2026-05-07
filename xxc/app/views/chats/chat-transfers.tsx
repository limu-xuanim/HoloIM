import {memo} from 'react';
import FileListItem from '../files/file-list-item';
import useUploadingFiles from '../files/use-uploading-files';

type ChatTransfersProps = {cgid: string;};

/**
 * ChatTransfers 组件 ，显示ChatTransfers界面
 * @param props React 组件属性对象
 * @param props.cgid 会话 GID
 * @returns JSX.Element
 */
function ChatTransfers(props: ChatTransfersProps) {
    const uploadingFiles = useUploadingFiles(props.cgid);

    if (!uploadingFiles.length) {
        return null;
    }

    return (
        <div className="app-chat-transfers -flex -flex-wrap -justify-between">
            {
                uploadingFiles.map(file => (
                    <FileListItem
                        key={file.gid}
                        file={file}
                        className="-inline-flex x-list-item"
                    />
                ))
            }
        </div>
    );
}

export default memo(ChatTransfers);
