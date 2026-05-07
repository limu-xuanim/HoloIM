/* eslint-disable react/require-default-props */
import * as React from 'react';
import {showContextMenu} from '~/app/core/context-menu';
import MemberNameSpan from '~/app/views/common/member-name-span';
import Icon from '~/app/components/icon';

type MemberNameTagProps = {
    memberID: number;
    showIcon?: boolean;
    icon?: string;
    iconClick?: (event: React.MouseEvent) => void;
    memberClick?: (event: React.MouseEvent) => void;
}
/**
 * 会员名称标签
 * @param memberID
 * @param showIcon
 * @param icon
 * @param iconClick
 * @param memberClick
 * @constructor
 */
function MemberNameTag({
    memberID,
    showIcon = true,
    icon = 'mdi-close',
    iconClick = undefined,
    memberClick = (event) => {showContextMenu('member.profile', {event, params: [`${memberID}`, false, true]});}
}: MemberNameTagProps) {
    return (
        <div
            key={memberID}
            className="x-outline -whitespace-nowrap -rounded-full -pl-1 -flex-none -flex -cursor-default -items-center -h-[20px] -border-[var(--color-black)]"
        >
            <div
                className="-cursor-pointer btn btn-sm !-p-0 -rounded -whitespace-nowrap"
                onClick={memberClick}
            >
                <MemberNameSpan memberID={memberID} />
            </div>
            {showIcon && (
                <Icon
                    name={icon}
                    className="-cursor-pointer btn btn-sm !-p-0 -rounded -ml-[-2px]"
                    onClick={iconClick}
                />
            )}
        </div>
    );
}

export default React.memo(MemberNameTag);
