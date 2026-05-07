import React, {useEffect, useRef, memo} from 'react';
import {classes} from '../../utils/html-helper';
import Icon from '../../components/icon';
import Spinner from '../../components/spinner';
import useLang from '../common/use-lang';

type MessageStatusProps = {
    isSending: boolean;
    isSendFailed: boolean;
    handleResendBtnClick: () => void;
    handleDeleteBtnClick: () => void;
} & Partial<{
    className: string;
}>;

/**
 * 消息发送状态组件
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @param props React 组件属性对象
 * @param props.message 消息对象
 * @param props.className 类名
 * @returns React Node content
 */
function MessageStatus(props: MessageStatusProps) {
    const {
        isSendFailed,
        isSending,
        className,
        handleResendBtnClick,
        handleDeleteBtnClick,
        ...others
    } = props;

    const [Lang] = useLang();
    const elementRef = useRef<HTMLDivElement>();

    useEffect(() => {
        const currentElement = elementRef.current;
        const sendingClassName = 'is-sending-long-time';
        if (isSending) {
            const addClassTimerID = !currentElement?.classList.contains(sendingClassName)
                ? setTimeout(() => currentElement.classList.add(sendingClassName), 100)
                : null;
            return (() => {
                if (addClassTimerID) {
                    clearTimeout(addClassTimerID);
                }
            });
        }
        if (currentElement?.classList.contains(sendingClassName)) {
            currentElement.classList.remove(sendingClassName);
        }
    }, [isSending]);

    if (!isSending && !isSendFailed) {
        return null;
    }

    return (
        <div
            className={classes('app-message-status', className, {
                'is-sending': isSending,
                'is-send-failed': isSendFailed
            })}
            ref={elementRef}
            {...others}
        >
            {
                isSendFailed
                    ? (
                        <>
                            <span className="text">{Lang.string('chat.message.sendFailed')}</span>
                            <nav className="nav nav-sm app-message-status-actions">
                                <a onClick={handleResendBtnClick}><Icon name="refresh" /> {Lang.string('chat.message.resend')}</a>
                                <a onClick={handleDeleteBtnClick}><Icon name="delete" /> {Lang.string('common.delete')}</a>
                            </nav>

                        </>
                    )
                    : <Spinner iconClassName="spin -inline-block text-primary" />
            }
        </div>
    );
}

export default memo(MessageStatus);
