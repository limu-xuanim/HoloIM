import {memo} from 'react';
import {renderIcon} from '~/app/components/icon';
import {isDividerItem} from '~/app/core/context-menu';
import {classes} from '~/app/utils/html-helper';
import {useAllUserConfig} from '../common/use-user-config';
import getChatSendboxToolbarItems, {type ChatSendboxButtonItem} from './chat-sendbox-toolbar-config';
import {renderIf} from '~/app/utils/render';

const svgMap = Object.freeze({
    'svg-file-upload-outline': (
        <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M8.36702 9.95318L5.68756 7.4375L3.0625 9.95318H4.81254V11.8126H6.56258V9.95318H8.36702Z" fill="#DCC5EF"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M10.5002 5.68762H5.68762V0.875019H1.75004C1.26681 0.875019 0.875019 1.26676 0.875019 1.75004V12.2503C0.875019 12.7335 1.26681 13.1253 1.75004 13.1253H9.62521C10.1084 13.1253 10.5002 12.7335 10.5002 12.2503V5.68762ZM5.68762 0H6.1388L10.9377 4.79893L11.3752 5.23644V12.2503C11.3752 13.2168 10.5917 14.0003 9.62521 14.0003H1.75004C0.783586 14.0003 0 13.2168 0 12.2503V1.75004C0 0.783533 0.783586 0 1.75004 0H5.68762Z" fill="#808080"/>
        </svg>
    ),
    'svg-folder-upload-outline': (
        <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M14 8.14286L11.0044 5L8 8.14286H10.1335V11H11.8655V8.14286H14Z" fill="#DCC5EF"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M2 0.5C0.895508 0.5 0 1.39545 0 2.5V3.5V11.5C0 12.6046 0.895508 13.5 2 13.5H14C15.1045 13.5 16 12.6046 16 11.5V4.5C16 3.39545 15.1045 2.5 14 2.5H8L6.5 0.5H2ZM1 3.5H14C14.5522 3.5 15 3.94769 15 4.5V11.5C15 12.0523 14.5522 12.5 14 12.5H2C1.44775 12.5 1 12.0523 1 11.5V3.5Z" fill="#808080"/>
        </svg>
    ),
    'svg-input-emoji': (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13ZM7 14C10.866 14 14 10.866 14 7C14 3.13401 10.866 0 7 0C3.13401 0 0 3.13401 0 7C0 10.866 3.13401 14 7 14Z" fill="#808080"/>
            <path d="M10.5 5.875C10.5 6.35825 10.1082 6.75 9.625 6.75C9.14175 6.75 8.75 6.35825 8.75 5.875C8.75 5.39175 9.14175 5 9.625 5C10.1082 5 10.5 5.39175 10.5 5.875Z" fill="#808080"/>
            <path d="M5.25 5.875C5.25 6.35825 4.85825 6.75 4.375 6.75C3.89175 6.75 3.5 6.35825 3.5 5.875C3.5 5.39175 3.89175 5 4.375 5C4.85825 5 5.25 5.39175 5.25 5.875Z" fill="#808080"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M3.5 8.5C3.83072 10.2116 5.27205 11.5 7 11.5C8.72795 11.5 10.1693 10.2116 10.5 8.5H3.5Z" fill="#D8BEED"/>
        </svg>
    ),
    'svg-input-image': (
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M11.3475 3.5002C11.5043 3.50464 11.6499 3.5824 11.7408 3.71024L14.4075 7.46024C14.5675 7.68528 14.5148 7.99745 14.2898 8.15748C14.0647 8.31751 13.7526 8.26481 13.5925 8.03976L11.3099 4.82975L7.72379 9.31235C7.55508 9.52323 7.2494 9.56204 7.03335 9.4L4.08771 7.19077L2.39045 9.31235C2.21795 9.52798 1.9033 9.56294 1.68767 9.39043C1.47204 9.21793 1.43708 8.90328 1.60958 8.68765L3.60958 6.18765C3.77829 5.97677 4.08397 5.93796 4.30002 6.1L7.24566 8.30923L10.9429 3.68765C11.0409 3.56516 11.1907 3.49576 11.3475 3.5002Z" fill="#D8BEED"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M14 1H2C1.44772 1 1 1.44772 1 2V10C1 10.5523 1.44772 11 2 11H14C14.5523 11 15 10.5523 15 10V2C15 1.44772 14.5523 1 14 1ZM2 0C0.895431 0 0 0.895431 0 2V10C0 11.1046 0.895431 12 2 12H14C15.1046 12 16 11.1046 16 10V2C16 0.895431 15.1046 0 14 0H2Z" fill="#808080"/>
        </svg>
    ),
});

function ChatSendboxButton(props: ChatSendboxButtonItem) {
    const {id, label, icon, onClick, className, onContextMenu, content} = props;
    return (
        <button
            data-hint={label}
            onContextMenu={onContextMenu}
            onClick={onClick}
            className={classes('btn iconbutton -rounded app-chat-sendbox-btn', className, `app-chat-sendbox-btn-${id}`)}
            type="button"
        >
            {
                icon in svgMap
                    ? svgMap[icon as keyof typeof svgMap]
                    : renderIcon(icon)
            }
            {renderIf(content) && <div className="content">{content}</div>}
        </button>
    );
}

type ChatSendboxToolbarProps = {
    chat: Chat;
    className?: string;
    sendButtonDisabled?: boolean;
};

function ChatSendboxToolbar(props: ChatSendboxToolbarProps) {
    const {
        className,
        chat,
        sendButtonDisabled = true,
    } = props;

    const userConfig = useAllUserConfig();
    const items = getChatSendboxToolbarItems(chat, {
        userConfig,
    });

    let lastButtonID = 'first';
    return (
        <div className={classes('app-chat-sendbox-toolbar -flex', className)}>
            <div className="-flex -items-center -flex-auto toolbar -flex-wrap">
                {
                    items.map((item) => {
                        if (isDividerItem(item)) {
                            return <div className="divider" key={`divider-${lastButtonID}`} />;
                        }
                        const buttonProps = item as ChatSendboxButtonItem;
                        lastButtonID = buttonProps.id;
                        return <ChatSendboxButton key={buttonProps.id} {...buttonProps} />
                    })
                }
            </div>
        </div>
    );
}

export default memo(ChatSendboxToolbar);
