import {classes} from '~/app/utils/html-helper';
import {formatBytes} from '~/app/utils/string-helper';
import {getFileNetworkErrorMessage} from '~/app/core/files/files-ui';
import {getShortTextOfDate} from '~/app/utils/date-helper';
import Icon from '~/app/components/icon';
import MemberNameSpan from '../common/member-name-span';
import {Lang} from '~/app/entries/vars/Lang';

export enum FileInfoType {
    size = 'size',
    progress = 'progress',
    error = 'error',
    sender = 'sender',
    date = 'date',
}

/**
 * 获取文件信息
 * @param file 文件对象
 * @param infoType 要显示的信息名称列表
 * @returns JSX.Element
 */
function renderFileInfo(file: FileData, infoType: FileInfoType) {
    switch (infoType) {
        case 'size': {
            const sizeText = formatBytes(file.size);
            if (!file.networking.isInProgress) {
                return sizeText;
            }

            return <span><span className="text-primary">{formatBytes(Math.min(file.size, +file.networking.loaded))}</span>/{sizeText}</span>;
        }
        case 'progress':
            if (!file.networking.isInProgress) {
                return null;
            }
            return `${Math.floor(file.networking.progress)}%`;
        case 'error': {
            const errorText = getFileNetworkErrorMessage(file);
            if (!errorText) {
                return null;
            }
            if (errorText.length < 6) {
                return errorText;
            }
            return <Icon name="alert" data-hint={errorText} className="text-danger" />;
        }
        case 'sender':
            return (
                <MemberNameSpan
                    className="btn btn-xs text-primary -rounded"
                    href={`@#${file.senderId}`}
                    type="a"
                    memberID={file.senderId}
                />
            );
        case 'date':
            return getShortTextOfDate(Lang, file.time);
        default:
            return null;
    }
}

type FileInfosProps = {
    file: FileData;
    infos?: FileInfoType[];
    showDate?: boolean;
    showSender?: boolean;
    className?: string;
};

/**
 * 文件状态组件
 * @param props React 组件属性对象
 * @param props.file 文件对象
 * @param props.infos 要显示的信息名称列表
 * @param props.showDate 是否显示文件发送日期信息
 * @param props.showSender 是否显示文件发送者信息
 * @returns JSX.Element
 */
export default function FileInfos(props: FileInfosProps) {
    const {
        infos = [FileInfoType.size, FileInfoType.progress, FileInfoType.error],
        showDate = false,
        showSender = false,
        file,
        className
    } = props;

    if (showSender && !infos.includes(FileInfoType.sender)) {
        infos.push(FileInfoType.sender);
    }
    if (showDate && !infos.includes(FileInfoType.date)) {
        infos.push(FileInfoType.date);
    }

    return (
        <ul className={classes('app-file-infos', className)}>
            {
                infos.map(infoType => {
                    const info = renderFileInfo(file, infoType);
                    if (!info) {
                        return null;
                    }
                    return <li key={infoType} className="app-file-info" data-info={infoType}>{info}</li>;
                })
            }
        </ul>
    );
}
