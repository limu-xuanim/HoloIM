import {useState, useEffect} from 'react';
import {windowSizeTypeSubject} from '~/app/utils/window-size-info';

/**
 * 窗口尺寸类型变更 Hook
 * @returns 窗口尺寸类型
 */
export default function useWindowSizeType() {
    const [sizeInfo, setSizeInfo] = useState(windowSizeTypeSubject.getValue());
    useEffect(() => {
        const subscription = windowSizeTypeSubject.subscribe(setSizeInfo);
        return () => subscription.unsubscribe();
    }, []);
    return sizeInfo;
}
