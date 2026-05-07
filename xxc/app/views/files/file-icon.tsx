import {classes} from '../../utils/html-helper';
import ProgressAvatar, {type ProgressAvatarProps} from '../../components/progress-avatar';
import getFileIcon from '../../utils/mdi-file-icon';

type FileIconProps = {
    file: FileData;
    size: number;
    className: string;
} & Omit<ProgressAvatarProps, 'skin'|'size'|'progress'|'className'|'icon'>;

/**
 * 文件状态组件
 * @param props React 组件属性对象
 * @param props.file 文件对象
 * @param props.size 图标大小
 * @returns JSX.Element
 */
export default function FileIcon(props: FileIconProps) {
    const {file, className, size = 20, ...other} = props;
    let fileIcon = getFileIcon(file.name);
    // show large sprite icons instead of regular sized sprite icons
    if (fileIcon.startsWith('sprite-') && size > 20) {
        fileIcon += '-large';
    }

    return (
        <ProgressAvatar
            skin={{code: file.extName, pale: true}}
            size={size}
            progress={file.networking.progress}
            className={classes('-flex-none shadow', size <= 20 ? '-rounded' : '-rounded-md', className)}
            icon={fileIcon}
            {...other}
        />
    );
}
