import React from 'react';
import Icon from '../../components/icon';
import Popover from '../../components/popover';
import Lang from '../../core/lang';
import {getAllUserConfig} from '../../core/profile';

/**
 * 显示聊天功能提示面板
 * @param {{x: number, y: number}} position 提示面板显示位置
 * @param {function=} callback 回调函数
 * @returns {void}
 */
export const showChatTipPopover = (position, callback) => {
    const popoverId = 'app-chat-tip-popover';
    const onRequestClose = () => {
        Popover.hide(popoverId);
    };
    const content = (
        <div>
            <div className="heading">
                <div className="title strong">{Lang.string('chat.tips.title')}</div>
                <nav className="nav">
                    <a
                        className="text-gray small"
                        onClick={() => {
                            getAllUserConfig().showMessageTip = false;
                            onRequestClose();
                        }}
                    ><Icon name="close" /> {Lang.string('chat.tips.close')}
                    </a>
                </nav>
            </div>
            <div className="box">
                <ul style={{paddingLeft: 20, marginBottom: 0}}>
                    <li>{Lang.string('chat.tips.dragging')}</li>
                    <li>{Lang.string('chat.tips.pasting')}</li>
                </ul>
            </div>
        </div>
    );
    return Popover.show(position, content, {id: popoverId, width: 320, height: 100}, callback);
};

export default {
    show: showChatTipPopover,
};
