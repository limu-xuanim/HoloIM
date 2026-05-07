import {useRef} from 'react';
import Config, {getSpecialVersionName} from '../../config';
import {formatDate} from '../../utils/date-helper';
import {simplifyVersion} from '../../utils/version';

/**
 * package.json 内容
 */
const PKG = Config.pkg;

/**
 * BuildInfo 组件 ，显示构建信息
 */
export default function BuildInfo(props: React.HTMLAttributes<HTMLDivElement>) {
    const lastClickTimeRef = useRef<number>();
    const clickTimesRef = useRef<number>();

    /**
     * 处理点击事件
     */
    const handleClick = () => {
        const now = Date.now();
        if (!lastClickTimeRef.current) {
            lastClickTimeRef.current = now;
        }

        if (!clickTimesRef.current) {
            clickTimesRef.current = 1;
            return;
        }

        if (now - lastClickTimeRef.current < 400) {
            clickTimesRef.current += 1;
            lastClickTimeRef.current = now;
            if (clickTimesRef.current >= 5) {
                window.electronAPI?.currentWindow.openDevTools();
            }
            return;
        }

        clickTimesRef.current = 0;
        lastClickTimeRef.current = 0;
    };

    const specialVersion = getSpecialVersionName();
    return (
        <div
            onClick={handleClick}
            title={`build at ${formatDate(PKG.buildTime)}`}
            {...props}
        >
            v{PKG.displayVersion || simplifyVersion(PKG.version)}{('distributeTime' in PKG && PKG.distributeTime) ? (` (${formatDate(PKG.distributeTime as DateLike, 'YYYYMMDDHHmm')})`) : null}{('buildVersion' in PKG && PKG.buildVersion) ? `.${PKG.buildVersion}` : null} {specialVersion ? (` for ${specialVersion}`) : ''} {DEBUG ? '[debug]' : ''}
        </div>
    );
}
