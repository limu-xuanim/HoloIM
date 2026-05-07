import {getAllLangList, loadLanguage} from '~/app/core/lang';
import Button from '~/app/components/button';
import {classes} from '~/app/utils/html-helper';
import useLang from './use-lang';
import type {Language} from '~/app/constants';

/**
 * LanguageSwitcher 组件 ，显示语言切换界面
 */
export default function LanguageSwitcher() {
    const [Lang, langName] = useLang();
    const langList = getAllLangList();

    return (
        <div className="app-lang-switcher">
            <header className="heading"><strong className="title">{Lang.string('common.selectLanguage')}</strong></header>
            <div className="space-sm row" style={{maxWidth: 520}}>
                {
                    langList.map(({name, label, labels}) => {
                        const isCurrent = langName === name;
                        return (
                            <Button
                                key={name}
                                className={classes('has-margin-sm -rounded -flex -flex-col -p-0 -min-w-[150px] -h-[60px]', {
                                    'bg-primary -text-white': isCurrent,
                                    'gray x-outline': !isCurrent,
                                })}
                                onClick={() => {loadLanguage(name as Language);}}
                            >
                                <strong className={classes({'text-dark': !isCurrent})}>{label}</strong>
                                {
                                    labels?.[langName]
                                        ? <div className="small">({labels[langName]})</div>
                                        : null
                                }
                            </Button>
                        );
                    })
                }
            </div>
        </div>
    );
}
