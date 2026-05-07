import {classes} from '~/app/utils/html-helper';
import {getFileMenuItems} from '~/app/core/files/files-ui';
import Icon from '~/app/components/icon';

type FileActionsProps = {file: FileData;}
    & Partial<{
        canViewMessageContext: boolean;
        canViewMessage: boolean;
        className: string;
    }>;

/**
 * 文件状态组件
 * @param props React 组件属性对象
 * @param props.file 文件对象
 * @param props.canViewMessageContext 是否能预览文件所属会话消息上下文
 * @param props.canViewMessage 是否能预览文件所属会话消息（尝试激活会话并高亮消息）
 * @returns React Node content
 */
export default function FileActions(props: FileActionsProps) {
    const {file, className, canViewMessageContext = false, canViewMessage = false} = props;
    const actions = getFileMenuItems(file, {canViewMessageContext, canViewMessage});

    if (!actions.length) {
        return null;
    }

    return (
        <div className={classes('app-file-actions', className)}>
            {
                actions.map(action => {
                    if (!action || typeof action !== 'object') {
                        return null;
                    }
                    const {icon, key, ...others} = action;
                    return (
                        <a key={key} {...others}>
                            <Icon name={icon} />
                        </a>
                    );
                })
            }
        </div>
    );
}
