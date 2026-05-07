import {useState, useEffect, memo} from 'react';
import type {WindowStateController} from '~/app/platform/electron/window-controller';
import {renderIf} from '../utils/render';

type WindowControlsBarProps = {
    controller: WindowStateController;
    title?: string;
};

/**
 * React 组件构造函数，创建一个 WindowControlsBar 组件实例，会在装配之前被调用。
 * @param props 组件属性对象
 * @returns JSX.Element
 */
function WindowControlsBar(props: WindowControlsBarProps) {
    const {controller, title = ''} = props;
    const [isMaximized, setIsMaximized] = useState(controller.isWindowMaximized);
    document.body.classList.toggle('maximized', isMaximized);

    useEffect(() => {
        const listener = () => {
            const maximized = controller.isWindowMaximized();
            setIsMaximized(maximized);
            document.body.classList.toggle('maximized', maximized);
        };
        controller.onWindowMaximizedChanged(listener);
        return () => controller.offWindowMaximizedChanged(listener);
    }, [controller]);

    if (!controller.showWindowControls) {
        return (
            <div className="user-app-dragable app-titlebar" onDoubleClick={controller.handleTitlebarDblClick}>
                {title && <div className="app-titlebar-title -truncate -text-center">{title}</div>}
            </div>
        );
    }

    return (
        <div className="app-titlebar">
            <div className="app-titlebar-drag-area user-app-dragable dock" />
            {renderIf(title) && <div className="app-titlebar-title -truncate -fixed -left-[110px] -right-[110px] -top-0 -text-center">{title}</div>}
            <nav className="nav app-nav-windows-control dock-right dock-top">
                <a id="min-window-btn" onClick={controller.minimizeWindow}><i className="icon mdi mdi-window-minimize" /></a>
                <a id="max-window-btn" onClick={() => controller.toggleWindowMaximized()}><i className={isMaximized ? 'icon mdi mdi-window-restore' : 'icon mdi mdi-window-maximize'} /></a>
                <a id="cls-window-btn" onClick={controller.closeWindow}><i className="icon mdi mdi-window-close" /></a>
            </nav>
        </div>
    );
}

export default memo(WindowControlsBar);
