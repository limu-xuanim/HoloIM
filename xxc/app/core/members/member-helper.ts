import {STATUS as MemberStatus} from './member';
import {getCurrentUserID, getCurrentUser} from '../profile';

/**
 * type guard for getMemberAvatar
 * @param avatar
 */
function isAvatarObj(avatar: any): avatar is {avatar:string} {
    return typeof avatar === 'object' && 'avatar' in avatar && typeof avatar.avatar === 'string';
}

/**
 * 获取用户头像地址
 * @param avatar 用户头像定义
 * @returns 用户头像地址
 */
export function getMemberAvatar(avatar: string | {avatar:string}) {
    if (!avatar) {
        return null;
    }

    if (isAvatarObj(avatar)) {
        avatar = avatar.avatar;
    }

    if (avatar.startsWith('$')) {
        return avatar.substr(1);
    }
    if (!/^(http?:|https?:|file:|data:|mdi-|icon-)/.test(avatar)) {
        const currentUser = getCurrentUser();
        if (currentUser) {
            return `${currentUser.serverUrlRoot}${avatar}`;
        }
    }
    return avatar;
}

/**
 * 对成员列表进行排序，排序规则 `orders` 可以为以下值：
 * - `function(m1: Member, m2: Member):number`，自定义排序函数；
 * - 一个用逗号分隔的根据属性排序的属性名称表；
 * - 根据属性排序的属性名称表数组。
 * 默认的排序规则为：`['me', 'status', 'realname', '-id']`。
 * @param  members 要排序的成员列表
 * @param  orders 排序规则
 * @returns 排序后的成员列表
 */
export const sortMembers = (members: Member[], orders?: string | boolean | any[] | ((...args: any[]) => number)) => {
    if (members.length < 2) {
        return members;
    }
    if (typeof orders === 'function') {
        return members.sort(orders);
    }
    if (!orders || orders === 'default' || orders === true) {
        orders = ['me', 'status', 'realname', '-id'];
    } else if (typeof orders === 'string') {
        orders = orders.split(' ');
    }
    let isFinalInverse = false;
    if (orders[0] === '-' || orders[0] === -1) {
        isFinalInverse = true;
        orders.shift();
    }
    const userMeId = getCurrentUserID();
    return members.sort((y, x) => {
        let result = 0;
        if (!Array.isArray(orders)) {
            return result;
        }
        for (let order of orders) {
            if (result !== 0) break;
            if (typeof order === 'function') {
                result = order(y, x);
            } else {
                const isInverse = order[0] === '-';
                if (isInverse) order = order.substr(1);
                let xStatus = x.status;
                let yStatus = y.status;
                let xValue;
                let yValue;
                switch (order) {
                    case 'me':
                        if (userMeId === x.id) result = 1;
                        else if (userMeId === y.id) result = -1;
                        break;
                    case 'realname':
                        if (x.realname && y.realname) {
                            result = x.realname.localeCompare(y.realname);
                        }
                        break;
                    case 'status':
                        if (xStatus === MemberStatus.$.online) xStatus = 100;
                        if (yStatus === MemberStatus.$.online) yStatus = 100;

                        result = xStatus > yStatus ? 1 : (xStatus === yStatus ? 0 : -1);
                        break;
                    default:
                        // TODO: 优化算法，避免使用类型断言
                        xValue = x[order as keyof Member];
                        yValue = y[order as keyof Member];
                        if (xValue === undefined || xValue === null) xValue = 0;
                        if (yValue === undefined || yValue === null) yValue = 0;

                        result = xValue > yValue ? 1 : (xValue === yValue ? 0 : -1);
                }
                result *= isInverse ? (-1) : 1;
            }
        }
        return result * (isFinalInverse ? (-1) : 1);
    });
};
