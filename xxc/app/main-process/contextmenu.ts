import {Menu} from 'electron';

/**
 * 显示右键上下文菜单
 * @param menuItems 要创建的上下文菜单项清单或者上下文菜单实例
 * @param x 菜单显示在 X 轴上的位置
 * @param y 菜单显示在 Y 轴上的位置
 * @param window 应用窗口实例
 */
export const popupContextMenu = (menuItems: Array<(Electron.MenuItemConstructorOptions) | (Electron.MenuItem)>, x: number, y: number) => {
    const menu = Menu.buildFromTemplate(menuItems)
    menu.popup({x, y});
};

/**
 * 显示文本输入框右键上下文菜单
 * @param x 菜单显示在 X 轴上的位置
 * @param y 菜单显示在 Y 轴上的位置
 * @param Lang LangHelper
 */
export const showInputContextMenu = (x: number, y: number, Lang: LangHelper) => {
    /** 文本输入框右键菜单 */
    const INPUT_MENU: (Electron.MenuItemConstructorOptions)[] = [
        {role: 'undo', label: Lang.string('menu.undo')},
        // {role: 'redo', label: lang.string('menu.redo')},
        {type: 'separator'},
        {role: 'cut', label: Lang.string('menu.cut')},
        {role: 'copy', label: Lang.string('menu.copy')},
        {role: 'paste', label: Lang.string('menu.paste')},
        {type: 'separator'},
        {role: 'selectAll', label: Lang.string('menu.selectAll')}
    ];
    popupContextMenu(INPUT_MENU, x, y);
};

/**
 * 显示选中的文本右键上下文菜单
 * @param x 菜单显示在 X 轴上的位置
 * @param y 菜单显示在 Y 轴上的位置
 * @param Lang LangHelper
 */
export const showSelectionContextMenu = (x: number, y: number, Lang: LangHelper) => {
    /** 文本选择右键菜单 */
    const SELECT_MENU: Electron.MenuItemConstructorOptions[] = [
        {role: 'copy', label: Lang.string('menu.copy')},
        {type: 'separator'},
        {role: 'selectAll', label: Lang.string('menu.selectAll')}
    ];
    popupContextMenu(SELECT_MENU, x, y);
};
