import {memo} from 'react';
import {HashRouter} from 'react-router-dom';
import ErrorBoundary from '~/app/components/error-boundary';
import AppView from './app-view';
import WindowControls from './window-controls';
import AutoReconnectBar from '../main/auto-reconnect-bar';
import {QueryClientProvider} from '@tanstack/react-query';
import {MainQueryClient} from '~/app/core/query-client';

/**
 * HomeIndex 组件 ，显示喧喧应用窗口界面
 */
function HomeIndex() {
    return (
        <QueryClientProvider client={MainQueryClient}>
            <HashRouter>
                <ErrorBoundary>
                    <AppView/>
                </ErrorBoundary>
                <WindowControls key="windowControls"/>
                <AutoReconnectBar key="autoReconnectBar" className="dock-top"/>
            </HashRouter>
        </QueryClientProvider>
    );
}

export default memo(HomeIndex);
