import {type ClassLike, classes} from '../utils/html-helper';
import Avatar, {type AvatarProps} from './avatar';

function Progress(props: Pick<ProgressAvatarProps, 'progress'|'hideOnComplete'>) {
    const {progress, hideOnComplete} = props;
    const currentProgress = progress ? Math.floor(progress) : 0;
    if (!progress || (hideOnComplete && currentProgress >= 100)) {
        return null;
    }

    const leftstyle: React.CSSProperties = {};
    const rightstyle: React.CSSProperties = {};
    if (currentProgress < 50) {
        rightstyle.transform = `rotate(${currentProgress * 3.6}deg)`;
    } else {
        rightstyle.display = 'none';
        leftstyle.transform = `rotate(${(currentProgress * 3.6) - 180}deg)`;
    }

    return (
        <div className={classes('circle-progress-box', {'circle-progress-full': progress >= 100})}>
            <span className="left-circle-progress circle-progress"><span style={leftstyle} /></span>
            <span className="right-circle-progress circle-progress"><span style={rightstyle} /></span>
        </div>
    );
}

export type ProgressAvatarProps = AvatarProps
    & Partial<{
        progress: false|number;
        hideOnComplete: boolean;
        className: ClassLike;
    }>;

/**
* ProgressAvatar 组件 ，显示一个包含进度覆盖层的头像
*/
export default function ProgressAvatar(props: ProgressAvatarProps) {
    const {className, progress, hideOnComplete = true, ...other} = props;

    const progressView = <Progress progress={progress} hideOnComplete={hideOnComplete} />;
    return (
        <Avatar className={classes({'circle-progress-wrapper': !!progressView}, className)} {...other}>
            {progressView}
        </Avatar>
    );
}
