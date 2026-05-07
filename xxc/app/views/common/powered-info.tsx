import useLang from './use-lang';

type PoweredInfoProps = Partial<{children: React.ReactNode;}>
    & React.HTMLAttributes<HTMLAnchorElement>;

/**
 * PoweredInfo 组件 ，显示版权信息界面
 * @param props 组件属性
 */
export default function PoweredInfo(props: PoweredInfoProps) {
    const [Lang] = useLang();
    return (
        <a
            href="https://xuanim.com"
            rel="noopener noreferrer"
            target="_blank"
            {...props}
        >
            {Lang.string('common.poweredBy')} {props.children}
        </a>
    );
}
