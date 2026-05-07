import {useCallback} from 'react';
import {useEffect, useRef, useState} from 'react';
import {classes} from '~/app/utils/html-helper';
import {sendImageFilesToChat} from '~/app/core/im/im-ui';
import {executeCommand} from '~/app/core/commander';
import EmojiIcon from '~/app/components/emoji-icon';
import useLang from '../common/use-lang';

/**
 * 处理拖放进入事件
 * @param e 事件对象
 */
const handleDndEnter = (e: React.DragEvent<HTMLDivElement>) => {
    const elm = e.target as HTMLElement;
    elm.classList.add('hover');
};

/**
 * 处理拖放离开事件
 * @param e 事件对象
 */
const handleDndLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const elm = e.target as HTMLElement;
    elm.classList.remove('hover');
};


/**
 * ChatsDndContainer 组件 ，显示聊天拖放功能交互容器
 */
export default function ChatsDndContainer(props: React.HTMLAttributes<HTMLDivElement>) {
    const {className} = props;
    const [dragging, setDragging] = useState(false);
    const dragLeaveTaskRef = useRef<NodeJS.Timeout>();
    const [Lang] = useLang();

    /**
     * 完成拖拽事件
     */
    const removeDndContainer = useCallback(() => {
        document.body.classList.remove('drag-n-drop-over-in');
        setTimeout(() => {
            document.body.classList.remove('drag-n-drop-over');
            setDragging(false);
        }, 350);
    }, []);

    /**
     * 处理拖放完成事件
     * @param e 事件对象
     */
    const handleDndDrop = useCallback((e: DragEvent) => {
        const elm = e.target as HTMLElement;
        removeDndContainer();
        if (!elm.classList.contains('app-chats-dnd-container')) {
            return;
        }

        elm.classList.remove('hover');
        const {dataTransfer} = e;
        if (!dataTransfer || !dataTransfer.files || dataTransfer.files.length === 0) {
            return;
        }

        const files: File[] = [];
        for (const item of dataTransfer.items) {
            let entry: FileSystemEntry | null;
            if (item.webkitGetAsEntry) {
                entry = item.webkitGetAsEntry();
                // @ts-expect-error
            } else if (item.getAsEntry) {
                // @ts-expect-error
                entry = item.getAsEntry();
            } else {
                break;
            }

            if (!entry) {
                continue;
            }

            if (entry.isDirectory) {
                executeCommand('showMessager', Lang.error('UPLOAD_FOLDER_NOT_SUPPORTED'), {type: 'warning'});
                return;
            }

            if (entry.isFile) {
                const file = item.getAsFile();
                if (file) {
                    files.push(file);
                }
            }
        }

        void sendImageFilesToChat(files);
    }, [Lang, removeDndContainer]);

    useEffect(() => {
        // 监听界面上拖拽过程中事件
        document.ondragover = e => {
            e.preventDefault();
            clearTimeout(dragLeaveTaskRef.current);
            if (e.dataTransfer?.types.includes('Files')) {
                setDragging(true);
                document.body.classList.add('drag-n-drop-over');
                setTimeout(() => {
                    document.body.classList.add('drag-n-drop-over-in');
                }, 10);
            }
            return false;
        };

        // 监听界面上拖拽离开
        document.ondragleave = e => {
            e.preventDefault();
            clearTimeout(dragLeaveTaskRef.current);
            dragLeaveTaskRef.current = setTimeout(removeDndContainer, 300);
            return false;
        };

        // 监听界面上拖拽完成
        document.ondrop = e => {
            e.preventDefault();
            clearTimeout(dragLeaveTaskRef.current);
            if (DEBUG) {
                console.collapse('DRAG FILE', 'redBg', (e.dataTransfer?.files?.length ? e.dataTransfer.files[0].path : ''), 'redPale');
                console.log(e);
                console.groupEnd();
            }

            handleDndDrop(e);
            return false;
        };

        return () => {
            clearTimeout(dragLeaveTaskRef.current);
            document.ondragover = null;
            document.ondragleave = null;
            document.ondrop = null;
        };
    }, [handleDndDrop, removeDndContainer]);

    if (!dragging) {
        return null;
    }

    return (
        <div
            className={classes('app-chats-dnd-container drag-n-drop-message center-content', className)}
            onDragEnter={handleDndEnter}
            onDragLeave={handleDndLeave}
        >
            <div className="-text-center">
                <EmojiIcon className="dnd-over" name=":hatching_chick:" />
                <EmojiIcon className="dnd-hover" name=":hatched_chick:" />
                <h1>{Lang.string('chats.dragNDropFileMessage')}</h1>
            </div>
        </div>
    );
}
