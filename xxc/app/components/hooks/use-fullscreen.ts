import {useState, useRef, useEffect, useCallback} from 'react';

/**
 * 获取当前全屏展示的元素
 * @returns 当前全屏展示的元素
 */
function getFullScreenElement(): Element {
    return document.fullscreenElement || document.webkitFullscreenElement;
}

/**
 * 当前是否为全屏状态
 * @returns 如果返回 `true` 则为是，否则为不是
 */
function isInFullScreen() {
    return !!getFullScreenElement();
}

/**
 * 检查全屏交互是否可用
 * @returns 全屏交互是否可用
 */
function isFullScreenEnabled() {
    return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
}

/**
 * 设置全屏状态
 * @param element 需要进行全屏展示的元素，如果不指定则使用 document.body
 * @param fullscreen 是否全屏，如果不指定，则自动切换
 * @returns 切换后的全屏状态
 */
function setFullScreen(element?: HTMLElement, fullscreen?: boolean) {
    element = element || document.body;

    const isAlreadyFullScreen = isInFullScreen();
    fullscreen = typeof fullscreen !== 'boolean' ? !isAlreadyFullScreen : fullscreen;

    if (isAlreadyFullScreen === fullscreen) {
        return fullscreen;
    }

    if (fullscreen) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullScreen) {
            element.webkitRequestFullScreen();
        }
        return true;
    }
    if (element.exitFullscreen) {
        element.exitFullscreen();
    } else if (element.webkitCancelFullScreen) {
        element.webkitCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
    }
    return false;
}

/**
 * 全屏交互 Hook
 * @returns 全屏交互提供对象
 */
export default function useFullscreen() {
    const [isFullScreen, setIsFullScreen] = useState(isInFullScreen);
    const ref = useRef<HTMLElement>();

    useEffect(() => {
        if (!isFullScreenEnabled()) {
            return;
        }

        const handleFullScreenChange = () => {
            setIsFullScreen(isInFullScreen());
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);

        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    const toggleFullScreen = useCallback((toggle: boolean) => {
        setFullScreen(ref.current, toggle);
    }, []);

    return {
        isFullScreen,
        ref,
        toggleFullScreen,
        fullscreenEnabled: isFullScreenEnabled(),
    };
}
