import * as ui from './ui';
import {playSound} from '../common/sound';

/**
 * 设置 Mac Dock 栏应用图标上的原点提示文本
 *
 * @param label 提示文本
 */
export const setBadgeLabel = (label: string|false) => {
    if (label === false) {
        label = '';
    }
    ui.setBadgeLabel(label);
};

/**
 * 更新通知栏图标
 * @param title 通知栏图标上的工具提示文本（鼠标悬停时显示）
 * @param flash 是否闪烁通知栏图标
 * @param noticeTitle 通知栏图标上的文本（仅适合 Mac）
 */
export const updateTrayIcon = (title: string, flash = false, noticeTitle = '') => {
    ui.setTrayTooltip(title);
    ui.flashTrayIcon(flash);
    ui.setTrayTitle(noticeTitle);
};

export default {
    requestAttention: ui.requestAttention,
    setBadgeLabel,
    updateTrayIcon,
    playSound,
};
