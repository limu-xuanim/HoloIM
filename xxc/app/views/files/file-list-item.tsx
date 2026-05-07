import {classes} from '~/app/utils/html-helper';
import FileInfos, {FileInfoType} from './file-infos';
import FileIcon from './file-icon';
import FileActions from './file-actions';
import useLang from '../common/use-lang';
import {renderIf} from '~/app/utils/render';

export type FileListItemProps = {file: FileData;}
    & React.HTMLAttributes<HTMLDivElement>
    & Partial<{
        showIcon: boolean;
        iconSize: number;
        showDate: boolean;
        showSender: boolean;
        multiLines: boolean;
        divider: boolean;
        compact: boolean;
        actions: boolean;
        infos: FileInfoType[];
        canViewMessageContext: boolean;
        canViewMessage: boolean;
    }>;

/**
 * 文件列表项组件
 * @param props React 组件属性对象
 * @param props.file 文件对象或文件 GID
 * @param props.showIcon 是否显示图标
 * @param props.iconSize 是否显示图标
 * @param props.showDate 是否显示文件发送日期信息
 * @param props.showSender 是否显示文件发送者信息
 * @param props.multiLines 是否显示为多行模式
 * @param props.divider 是否显示分割线
 * @param props.compact 是否显示为紧凑模式
 * @param props.actions 是否显示为文件操作按钮
 * @param props.infos 要显示的信息名称列表
 * @param props.canViewMessageContext 是否能预览文件所属会话消息上下文
 * @param props.canViewMessage 是否能预览文件所属会话消息（尝试激活会话并高亮消息）
 * @param props.className 类名
 * @returns JSX.Element
 */
export default function FileListItem(props: FileListItemProps) {
    const {
        className,
        file,
        showIcon = true,
        iconSize,
        showDate = false,
        showSender = false,
        multiLines = false,
        divider = false,
        compact = false,
        actions = true,
        infos = [FileInfoType.size, FileInfoType.progress, FileInfoType.error],
        canViewMessageContext = false,
        canViewMessage = false,
        ...others
    } = props;

    const [Lang] = useLang();
    const fileName = file.name;

    return (
        <div
            className={classes(
                'app-file-list-item item -items-center single',
                className,
                {
                    compact,
                    divider,
                    'multi-lines': multiLines,
                    'has-cache-file': !!file.cachePath,
                    editable: file.editable,
                }
            )}
            {...others}
        >
            {renderIf(showIcon) && (
                <FileIcon
                    className="-flex-none"
                    file={file}
                    size={iconSize ?? (compact ? 20 : 30)}
                />
            )}
            <div className="content">
                {renderIf(file.editable) && (<div className={classes('label -rounded-full accent', {'label-sm': !compact, 'label-xs': compact})}>{Lang.string('file.collabora.abbr')}</div>)}
                <div className="title x-text-ellipsis" title={fileName}>
                    {fileName}
                </div>
                <FileInfos
                    file={file}
                    infos={infos}
                    showDate={showDate}
                    showSender={showSender}
                />
            </div>
            {renderIf(actions) && (
                <FileActions
                    className="-flex-none"
                    file={file}
                    canViewMessageContext={canViewMessageContext}
                    canViewMessage={canViewMessage}
                />
            )}
        </div>
    );
}
