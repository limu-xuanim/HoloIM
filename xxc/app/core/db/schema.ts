import {isNotEmptyString} from '~/app/utils/check-empty';

/**
 * 默认类型表
 */
enum TYPES {
    int = 'int',
    float = 'float',
    string = 'string',
    boolean = 'boolean',
    object = 'object',
    array = 'array',
    set = 'set',
    timestamp = 'timestamp',
    datetime = 'datetime',
    json = 'json',
    any = 'any',
}

/**
 * 默认值转换器
 */
const defaultValuesConverter = {
    int: (val: any): number => {
        if (typeof val !== 'number') {
            val = Number.parseInt(val, 10);
        }
        if (Number.isNaN(val)) {
            return 0;
        }
        return val;
    },
    float: (val: any): number => {
        if (typeof val !== 'number') {
            val = Number.parseFloat(val);
        }
        return val;
    },
    string: (val: any): string => {
        if (val !== null && val !== undefined && typeof val !== 'string') {
            return `${val}`;
        }
        return val;
    },
    boolean: (val: any): boolean => {
        if (typeof val === 'string') {
            return val === '1' || val === 'true' || val === 'yes';
        }
        return !!val;
    },
    array: (val: any): any[] => {
        if (Array.isArray(val)) {
            return val;
        }
        if (typeof val === 'string') {
            return val.split(',');
        }
        return val !== null && val !== undefined ? [val] : [];
    },
    set: (val: any): Set<any> => {
        if (val instanceof Set) {
            return val;
        }
        if (Array.isArray(val)) {
            return new Set(val);
        }
        if (typeof val === 'string') {
            const set = new Set();
            for (const x of val.split(',')) {
                if (x !== '') set.add(x);
            }
            return set;
        }
        return new Set(val);
    },
    timestamp: (val: any): number => {
        if (typeof val === 'string') {
            val = new Date(val).getTime();
        }
        if (val < 10000000000) {
            val *= 1000;
        }
        return val;
    },
    datetime: (val: any): Date => {
        if (val instanceof Date) {
            return val;
        }
        return new Date(val);
    },
    json: (json: any): any => {
        if (typeof json === 'string') {
            if (isNotEmptyString(json)) {
                try {
                    return JSON.parse(json);
                } catch {
                    return null;
                }
            }
            return null;
        }
        return json;
    }
};

type SchemaType = Record<string, Meta>;

type Meta = {
    type: keyof typeof TYPES;
    indexed?: boolean;
    primaryKey?: boolean;
    unique?: boolean;
    defaultValue?: any;
    convertGetterValue?: (key: string, val: any, entity: Entity) => any;
    convertSetterValue?: (key: string, val: any, entity: Entity) => any;
    getter?: (val: any, that: Entity) => any;
    setter?: (val: any, that: Entity) => any;
    default?: any;
};

/**
 * 数据库存储实体属性结构管理类，用于定义实体内所有属性的定义
 */
export default class Schema {
    /**
     * 扩展一个属性结构管理器并返回一个新的属性结构管理类实例
     * @static
     * @param parent 要扩展的属性结构管理器实例
     * @param newSchema 新的数学定义表
     * @returns 新的属性结构管理类实例
     */
    static extend(parent: Schema, newSchema: SchemaType): Schema {
        return new Schema({...parent.schema, ...newSchema});
    }

    /**
     * 主键
     */
    primaryKey: string;

    /**
     * schema
     */
    schema: SchemaType;

    /**
     * 创建一个数据库存储实体属性结构管理类
     * @param schema 属性结构管理对象
     */
    constructor(schema: SchemaType) {
        let primaryKeyNumber = 0;
        for (const [name, meta] of Object.entries(schema)) {
            if (meta.type && !(meta.type in TYPES)) {
                throw new Error(`Cannot create schema, because the type(${meta.type}) is not a valid type.`);
            }
            if (DEBUG && meta.type === 'boolean' && (meta.indexed || meta.primaryKey)) {
                console.warn('Cannot use boolean type as index, see https://dexie.org/docs/Indexable-Type');
            }
            if (meta.primaryKey) {
                primaryKeyNumber += 1;
                this.primaryKey = name;
            }
        }
        if (primaryKeyNumber !== 1) {
            if (DEBUG) {
                console.trace('schema', schema);
            }
            throw new Error(`Cannot create schema, because there has ${primaryKeyNumber} primary key(s).`);
        }

        this.schema = schema;
    }

    /**
     * 获取指定名称的属性定义对象
     *
     * @param name 属性名称
     * @param useDefault 如果没有找定义是否使用默认定义
     * @returns 属性定义对象
     */
    of(name: string, useDefault: Meta|boolean = false): Meta | null {
        const schema = this.schema[name];
        if (schema) {
            return {
                type: TYPES.any,
                indexed: false,
                ...this.schema[name]
            };
        }
        if (useDefault) {
            if (typeof useDefault === 'object') {
                return useDefault;
            }
            return {
                type: TYPES.any,
                indexed: false,
            };
        }
        return null;
    }

    /**
     * 转换属性值
     *
     * @param name 属性名称
     * @param value 属性值
     * @param meta 属性定义对象
     * @returns 转换后的值
     */
    convertValue(name: string, value: any, meta = this.of(name)): any {
        if (meta) {
            if (meta.type && meta.type !== 'object' && meta.type !== 'any') {
                return defaultValuesConverter[meta.type](value);
            }
            if (value === undefined && meta.defaultValue !== undefined) {
                value = meta.defaultValue;
            }
        }
        return value;
    }

    /**
     * 转换用于读取的属性值
     *
     * @param name 属性名称
     * @param value 属性值
     * @returns 转换后的值
     */
    convertGetterValue(name: string, value: any, that: Entity): any {
        const meta = this.of(name);
        if (meta) {
            if (meta.getter) {
                return meta.getter.call(that, name);
            }
            if (meta.type && meta.type !== 'object' && meta.type !== 'any') {
                return defaultValuesConverter[meta.type](value);
            }
            if (value === undefined && meta.defaultValue !== undefined) {
                value = meta.defaultValue;
            }
        }
        return value;
    }

    /**
     * 转换用于存储的属性值
     *
     * @param name 属性名称
     * @param value 属性值
     * @param that 要转换的实体对象
     * @returns 转换后的值
     */
    convertSetterValue(name: string, value: any, that: Entity): any {
        const meta = this.of(name);
        if (meta) {
            if (meta.setter) {
                return meta.setter.call(that, value, that);
            }
            if (meta.type && meta.type !== 'object' && meta.type !== 'any') {
                return defaultValuesConverter[meta.type](value);
            }
            if (value === undefined && meta.defaultValue !== undefined) {
                value = meta.defaultValue;
            }
        }
        return value;
    }

    /**
     * 扩展更多属性定义并返回一个新的属性结构管理类实例
     * @param newSchema 新的数学定义表
     * @returns 新的属性结构管理类实例
     */
    extend(newSchema: SchemaType): Schema {
        return Schema.extend(this, newSchema);
    }

    /**
     * 获取用于定义 Dexie 表的格式字符串
     */
    get dexieFormat(): string {
        const formats = [this.primaryKey];

        for (const [name, meta] of Object.entries(this.schema)) {
            if (name === this.primaryKey) {
                continue;
            }
            if (meta.indexed !== false) {
                if (meta.unique) {
                    formats.push(`&${name}`);
                } else if (meta.indexed) {
                    formats.push(name);
                }
            }
        }
        return formats.join(',');
    }
}
