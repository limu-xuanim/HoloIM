import React from 'react';
import EmojionePicker from 'emojione-picker';
import EmojiMartPicker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';
import emojiMartI18nZh from '@emoji-mart/data/i18n/zh.json';
import Popover from '../../components/popover';
import Lang from '../../core/lang';
import {getAllUserConfig} from '../../core/profile';
import Config from '../../config';
import Emoji from '../../components/emoji';
import {initEmojiListForPicker} from '../../components/emojione-picker/emoji.json.js';

/**
 * Emoji 分类信息
 * @type {Map<string, {title: string, emoji: string}>}
 * @private
 */
const emojiCategories = {
    people: {
        title: Lang.string('emoji.category.people', '表情与人物'),
        emoji: 'smile'
    },
    nature: {
        title: Lang.string('emoji.category.nature', '动物与自然'),
        emoji: 'hamster'
    },
    food: {
        title: Lang.string('emoji.category.food', '食物与饮料'),
        emoji: 'pizza'
    },
    activity: {
        title: Lang.string('emoji.category.activity', '活动'),
        emoji: 'soccer'
    },
    travel: {
        title: Lang.string('emoji.category.travel', '旅行与地点'),
        emoji: 'earth_americas'
    },
    objects: {
        title: Lang.string('emoji.category.objects', '物体'),
        emoji: 'bulb'
    },
    symbols: {
        title: Lang.string('emoji.category.symbols', '符号'),
        emoji: 'clock9'
    },
    flags: {
        title: Lang.string('emoji.category.flags', '旗帜'),
        emoji: 'flag_cn'
    }
};

/**
 * 显示 Emoji 选择提示面板
 * @param {{x: number, y: number}} position 提示框显示位置
 * @param {function(data: Object)} onSelectEmoji 当选择 Emoji 表情时的回调函数
 * @param {function=} callback 回调函数
 * @returns {void}
 */
export const showEmojiPopover = (position, onSelectEmoji, callback) => {
    initEmojiListForPicker();

    const popoverId = 'app-emoji-popover';
    const {enableSearchInEmojiPicker} = getAllUserConfig();
    return Popover.show(
        position,
        Config.ui['chat.useNativeEmoji'] ? (
            <EmojiMartPicker
                data={emojiData}
                i18n={Lang.name.startsWith('zh') ? emojiMartI18nZh : undefined}
                previewPosition="none"
                searchPosition={enableSearchInEmojiPicker ? 'sticky' : 'none'}
                set="native"
                perLine={8}
                maxFrequentRows={2}
                emojiVersion={5}
                noCountryFlags
                onEmojiSelect={data => {
                    if (onSelectEmoji) {
                        onSelectEmoji(data);
                    }
                    Popover.hide(popoverId);
                }}
            />
        ) : (
            <EmojionePicker
                categories={emojiCategories}
                style={{height: 260, width: 280}}
                search={enableSearchInEmojiPicker ? true : undefined}
                searchPlaceholder={enableSearchInEmojiPicker ? Lang.string('common.search') : undefined}
                emojione={{imagePathPNG: Config.media['emoji.imagePathPNG'], imageType: Config.media['emoji.imageType']}}
                onChange={data => {
                    if (onSelectEmoji) {
                        onSelectEmoji(data);
                    }
                    Popover.hide(popoverId);
                }}
            />
        ),
        {
            id: popoverId,
            cache: !Config.ui['chat.useNativeEmoji'],
            ...(
                Config.ui['chat.useNativeEmoji'] ? {width: 316, height: 435} : {width: 280, height: 261}
            )
        },
        callback
    );
};

export default {
    show: showEmojiPopover,
};
