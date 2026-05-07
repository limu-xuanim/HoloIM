import {memo} from 'react';
import WindowControlsBar from '~/app/components/window-controls-bar';
import platform from '~/app/platform';

import type {WindowStateController} from '~/app/platform/electron/window-controller';

/**
 * React 组件构造函数，创建一个 WindowControls 组件实例，会在装配之前被调用。
 * @returns JSX.Element
 */
function WindowControls() {
    if (platform.isBrowser) {
        return null;
    }
    const controller: WindowStateController = platform.call('ui.getWindowStateController');
    return <WindowControlsBar controller={controller} />;
}

export default memo(WindowControls);
