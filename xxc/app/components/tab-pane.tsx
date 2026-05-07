type TabPaneProps = React.HTMLAttributes<HTMLDivElement>
    & Partial<{
        label: React.ReactNode;
        children: (() => React.ReactNode)|React.ReactNode;
    }>;

/**
 * TabPane 组件 ，显示一个标签页内容控件
 */
export default function TabPane(props: TabPaneProps) {
    const {

        label = 'tab',
        children,
        ...other
    } = props;

    return <div {...other}>{typeof children === 'function' ? children() : children}</div>;
}
