import {BehaviorSubject} from "rxjs";

/**
 * 尺寸类型
 */
 enum WINDOW_SIZE_TYPES {
    small = 1,
    middle = 2,
    normal = 3,
    large = 4,
}

/**
 * 窗口信息类
 */
class WindowSizeInfo {
    /**
     * 窗口宽度
     */
    readonly width: number;

    /**
     * 窗口高度
     */
    readonly height: number;

    /**
     * 窗口尺寸类型
     */
    readonly type: WINDOW_SIZE_TYPES;

    /**
     * 创建一个窗口信息对象
     */
    constructor() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        const {width} = this;
        if (width < 500) {
            this.type = WINDOW_SIZE_TYPES.small; // 仅允许显示会话界面，隐藏会话列表和会话侧边栏
        } else if (width < 740) {
            this.type = WINDOW_SIZE_TYPES.middle; // 允许显示会话列表和会话界面，隐藏侧边栏
        } else if (width < 1080) {
            this.type = WINDOW_SIZE_TYPES.normal; // 允许显示完整界面
        } else {
            this.type = WINDOW_SIZE_TYPES.large; // 允许显示更多的其他内容
        }
    }

    /**
     * 判断是否是小尺寸窗口
     */
    get isSmall(): boolean {
        return this.type === 1;
    }

    /**
     * 判断是否是大于小尺寸窗口，即至少为中等大小窗口
     */
    get isLargerThanSmall(): boolean {
        return this.type > 1;
    }

    /**
     * 判断是否是为中等大小窗口
     */
    get isMiddle(): boolean {
        return this.type === 2;
    }

    /**
     * 判断是否是大于中等尺寸窗口，即至少为正常大小窗口
     */
    get isLargerThanMiddle(): boolean {
        return this.type > 2;
    }

    /**
     * 判断是否是小于中等尺寸窗口，即为小尺寸窗口
     */
    get isSmallerThanMiddle(): boolean {
        return this.type < 2;
    }

    /**
     * 判断是否是正常尺寸窗口
     */
    get isNormal(): boolean {
        return this.type === 3;
    }

    /**
     * 判断是否是大于正常尺寸窗口，即为大的窗口
     */
    get isLargerThanNormal(): boolean {
        return this.type > 3;
    }

    /**
     * 判断是否是小于正常尺寸窗口
     */
    get isSmallerThanNormal(): boolean {
        return this.type < 3;
    }

    /**
     * 判断是否是大尺寸窗口
     */
    get isLarge(): boolean {
        return this.type === 4;
    }

    /**
     * 判断是否小于大尺寸窗口，即为普通尺寸窗口大小以下
     */
    get isSmallerThanLarge(): boolean {
        return this.type < 4;
    }
}

const sizeInfo = new WindowSizeInfo();

window.addEventListener('resize', () => {
    const sizeInfo = new WindowSizeInfo();
    const currentSizeInfo = windowSizeTypeSubject.getValue();
    if (currentSizeInfo.type !== sizeInfo.type) {
        windowSizeTypeSubject.next(sizeInfo);
    }
});

export type {WindowSizeInfo};
export const windowSizeTypeSubject = new BehaviorSubject(sizeInfo);
