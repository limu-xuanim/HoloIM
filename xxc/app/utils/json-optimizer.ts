import OptimizerError from './optimizer-error';

/**
 * 支持的 JSON 类型 | Supported json types
 */
enum JSONType {
    any = 'any',
    string = 'string',
    number = 'number',
    boolean = 'boolean',
    object = 'object',
    array = 'array',
}

/**
 * 支持的 JSON 类型名称 | Supported json type names
 */
type JSONTypeName = keyof typeof JSONType;

/**
 * 编码前的数据，可以为 JSON 支持的所有类型 | Original data before encode
 */
type OriginalData = any;

/**
 * 编码后的数据，可能为 JSON 支持的所有类型 | Data after encoded
 */
type EncodedData = any;

/**
 * 数据类型名称 | Data type name
 */
type DataTypeName = string;

/**
 * 正则表达式字符串 | Regex string
 */
type RegexString = string;

/**
 * 特殊值索引 | Special value index
 */
type SpecialValueIndex = string | number;

/**
 * 特殊值映射数组 | Special values mapping array
 */
type SpecialValuesMapArray = OriginalData[];

/**
 * 特殊值映射对象 | Special values mapping object
 */
type SpecialValuesMapObject = {
    [specialValues: string]: OriginalData
}

/**
 * 特殊值映射 | Special values mapping
 */
type SpecialValuesMap = SpecialValuesMapObject | SpecialValuesMapArray;

/**
 * 属性描述数组 | Properties scheme array
 */
type DataProperties = DataPropertyTypeScheme[];

/**
 * 数据类型描述对象 | Data type scheme object
 */
export interface DataTypeScheme {
    /**
     * 数据类型描述名称 | Data type scheme name
     */
    _schemeName?: DataTypeName;

    /**
     * 进行编码操作时用于进行快速比较的特殊值映射键值表
     */
    _mapForEncode?: SpecialValuesMap;

    /**
     * 引用的类型名称 | Data type name
     */
    type: JSONTypeName | DataTypeName;

    /**
     * 属性名称 | Property name
     */
    name?: string;

    /**
     * 属性描述数组 | Properties schemes array
     */
    props?: DataProperties,

    /**
     * 扩展的类型名称 | Data type name to extend
     */
    extend?: DataTypeName;

    /**
     * 数组条目类型名称 | Array item data type name
     */
    arrType?: DataTypeName;

    /**
     * 默认值 | Default value
     */
    default?: OriginalData;

    /**
     * 进行验证的正则表达式 | Regex string to validation
     */
    match?: RegexString;

    /**
     * 特殊值映射键值表 | Special values map
     */
    map?: SpecialValuesMap;

    /**
     * 进行验证时判断是否为必须有值 | Whether to check data has value
     */
    required?: boolean;
}

/**
 * 属性类型描述对象 | Property scheme object
 */
interface DataPropertyTypeScheme extends DataTypeScheme {
    /**
     * 属性名称
     */
    name: DataTypeName;
}

/**
 * 数据定义映射键值表 | Data mapping scheme map name-values
 */
type MappingSchemeMap = {
    /**
     * 数据定义映射表中的数据类型定义 | Data type scheme data
     */
    readonly [dataTypeName: string]: DataTypeScheme
};

/**
 * 数据定义映射键值表缓存 | Data mapping scheme map name-values cache
 */
type MappingSchemeMapCache = {
    /**
     * 数据定义映射表中的数据类型定义 | Data type scheme data
     */
    [dataTypeName: string]: DataTypeScheme
};

/**
 * 数据定义映射表 | Data mapping scheme
 * 数据定义文件存储的内容，为一个 JSON 对象，一个数据定义映射表即代表了一套 API 数据传输优化方案，涵盖所有 API 中可能存在的数据类型
 */
export type MappingScheme = {
    /**
     * 数据定义映射表的版本 | Data mapping scheme version
     */
    readonly $version: string;

    /**
     * 是否启用数据值验证功能，默认为不启用 | Whether to enable data value validation, the default is false
     */
    readonly $validation?: boolean;

    /**
     * 是否在编码数据时包含类型描述名称 | Whether include type scheme name in encoded data
     */
    readonly $encodeName?: boolean;

    /**
     * 是否省略为默认值的尾部属性 | Whether to omit object properties in tail with default value
     */
    readonly $omitDefaultProps?: boolean;

    /**
     * 数据定义映射表中的数据类型定义 | Data type scheme data
     */
    readonly [dataTypeName: string]: DataTypeScheme | string | boolean | number
};

/**
 * 内部类型映射键值表 | Internal data mapping scheme map name-values
 */
const internalMapScheme: MappingSchemeMap = {
    string: {
        type: 'string',
        // map: ['', null]
    },
    boolean: {
        type: 'boolean',
        map: [false, true, null]
    },
    number: {
        type: 'number',
    },
    array: {
        type: 'array',
        // map: [null, []]
    },
    object: {
        type: 'object',
        // map: [null, {}]
    },
    any: {
        type: 'any'
    }
};

/**
 * 将引用的类型描述对象合并到当前目标数据表述对象中，合并后的类型为引用的类型描述对象类型 | Merge target scheme to source scheme
 * @param targetScheme 目标类型描述对象 | Target scheme object
 * @param sourceScheme 要合并到目标类型描述对象中的原始类型描述对象（通常为 `type` 字段自定义的类型描述对象） | Source scheme object
 * @returns 最终合并的数据表述对象 | Final target scheme
 */
const mergeScheme = (targetScheme: DataTypeScheme, sourceScheme: DataTypeScheme): DataTypeScheme => ({...sourceScheme, ...targetScheme, type: sourceScheme.type});

/**
 * 将引用的类型描述对象上的所有属性合并到当前目标数据表述对象中 | Extend properties from target scheme to source scheme
 * @param targetScheme 目标类型描述对象 | Target scheme object
 * @param sourceScheme 要继承属性到目标类型描述对象中的原始类型描述对象（通常为 `type` 字段自定义的类型描述对象） | Source scheme object for extend its properties to target scheme object
 */
const extendSchemeProps = (targetScheme: DataTypeScheme, sourceScheme: DataTypeScheme): DataTypeScheme => {
    const sourceProps = sourceScheme.props;
    const targetProps = targetScheme.props;

    // 如果无需进行扩展操作则直接返回 | Return target scheme object directly if no need to extend
    if (!sourceProps || !sourceProps.length || !targetProps.length) {
        return targetScheme;
    }

    const sourcesNameMap: Record<string, any> = {};
    const mergedProps = sourceProps.map((prop, index) => {
        sourcesNameMap[prop.name] = index;
        return prop;
    });
    targetProps.forEach((prop) => {
        if (sourcesNameMap[prop.name] !== undefined) {
            mergedProps[sourcesNameMap[prop.name]] = prop;
        } else {
            mergedProps.push(prop);
        }
    });

    targetScheme.props = mergedProps;

    return targetScheme;
};

/**
 * 根据类型描述对象上的验证规则对原始数据进行验证，如果不通过则返回错误对象 | Validate original value with validation rules in data type scheme, if not match the rules then return an [OptimizerError] object.
 * @param scheme 数据对应的描述对象 | Data type scheme object
 * @param value 要检查的原始数据 | Original data value
 * @returns 如果不通过则返回错误对象 | If not match the rules then return an [OptimizerError] object
 */
const checkValidationError = (scheme: DataTypeScheme, value: OriginalData): Error => {
    if (value === undefined && scheme.required) {
        const error = new OptimizerError(`JSONOptimizer: Data value of scheme type "${scheme._schemeName}" is required.`);
        error.scheme = scheme;
        throw error;
    }
    if (scheme.match) {
        if (value === null) {
            const error = new OptimizerError(`JSONOptimizer: Data value of scheme type "${scheme._schemeName}" is not match regex rule, because original value is ${value.toString()}.`);
            error.scheme = scheme;
            throw error;
        }
        const valueString = typeof value === 'object' ? JSON.stringify(value) : value.toString();
        if (!(new RegExp(scheme.match).test(valueString))) {
            const error = new OptimizerError(`JSONOptimizer: Data value of scheme type "${scheme._schemeName}" is not match regex rule.`);
            error.scheme = scheme;
            throw error;
        }
    }
    return null;
};

/**
 * 根据类型描述对象上的特殊值映射获取映射后的特殊值索引 | Get special value index by given scheme object
 * @param map 特殊值映射方案 | Special values mapping object
 * @param value 原始数据 | Original data value
 * @returns 返回特殊值索引 | Return special value index
 */
const getSpecialValueIndex = (map: SpecialValuesMap, value: OriginalData): SpecialValueIndex => {
    const objectMapValue = typeof value === 'object' ? JSON.stringify(value) : value;
    if (Array.isArray(map)) {
        for (let i = 0; i < map.length; ++i) {
            if (map[i] === objectMapValue) {
                return i;
            }
        }
    } else {
        const mapObject = map as SpecialValuesMapObject;
        const mapKeys = Object.keys(mapObject);
        for (let i = 0; i < mapKeys.length; ++i) {
            const specialValueIndex = mapKeys[i];
            if (mapObject[specialValueIndex] === objectMapValue) {
                return specialValueIndex;
            }
        }
    }
};

/**
 * 根据类型描述对象上的特殊值映射获取映射后的特殊值 | Get special value by given scheme object
 * @param map 特殊值映射方案 | Special values mapping object
 * @param value 原始数据 | Encoded data value
 * @returns 返回特殊值 | Return special value
 */
const getSpecialValue = (map: SpecialValuesMap, value: EncodedData): OriginalData => {
    if (Array.isArray(map)) {
        return map[value];
    }
    const mapObject = map as SpecialValuesMapObject;
    return mapObject[value];
};

/**
 * 判断两个 JSON 数据的内容是否相等 | Check two json data weather is equal
 * @param data1 第一个数据 | First data to compare
 * @param data2 第二个数据 | Second data to compare
 * @returns 如果不相等返回 `false`，否则返回 `true` | If equal then return `true`, else return `false`
 */
export const isJSONDataEqual = (data1: any, data2: any): boolean => {
    if (data1 === data2) {
        return true;
    }
    if (Array.isArray(data1) && Array.isArray(data2)) {
        if (data1.length !== data2.length) {
            return false;
        }
        for (let i = 0; i < data1.length; ++i) {
            if (!isJSONDataEqual(data1[i], data2[i])) {
                return false;
            }
        }
        return true;
    }
    if (typeof data1 === 'object' && typeof data2 === 'object') {
        const keys1 = Object.keys(data1);
        const keys2 = Object.keys(data2);
        if (keys1.length !== keys2.length) {
            return false;
        }
        for (const key of keys1) {
            if (!isJSONDataEqual(data1[key], data2[key])) {
                return false;
            }
        }
        return true;
    }
    return false;
};

/**
 * JSON 数据优化工具类 | JSON optimizer class
 */
export default class JSONOptimizer {
    /**
     * 数据定义映射表对象 | Data mapping scheme
     * @type {MappingScheme}
     */
    readonly mappingScheme: MappingScheme;

    /**
     * 类型描述对象缓存 | Data mapping scheme cache
     * @type {MappingSchemeMap}
     */
    private readonly mappingSchemeCache: MappingSchemeMapCache = {};

    /// 类型描述名称清单(index to name) | type scheme names list
    private schemeNamesIndex: DataTypeName[];

    /// 类型描述名称索引(name to index) | type scheme names index map
    private schemeNamesIndexMap: Record<DataTypeName, number>;

    identify: string;

    /**
     * 创建一个 JSON 数据优化工具类实例 | Create a JSON optimizer instance
     * @param mappingScheme 数据定义映射表对象 | Data mapping scheme object
     */
    constructor(mappingScheme: MappingScheme) {
        this.mappingScheme = Object.freeze({...internalMapScheme, ...mappingScheme});
    }

    /**
     * 获取数据定义映射表版本 | Data mapping scheme version
     * @readonly
     * @type {string}
     */
    get version(): string {
        return this.mappingScheme.$version as string;
    }

    /**
     * 是否启用数据验证 | Whether to enable data value validation, the default is false
     * @readonly
     * @type {boolean}
     */
    get validation(): boolean {
        return !!this.mappingScheme.$validation;
    }

    /**
     * 是否省略为默认值的尾部属性 | Whether to omit object properties in tail with default value
     *
     * @readonly
     * @type {boolean}
     */
    get omitDefaultProps(): boolean {
        return !!this.mappingScheme.$omitDefaultProps;
    }

    /**
     * 是否在编码数据时包含类型描述名称 | Whether include type scheme name in encoded data
     * @readonly
     * @type {boolean}
     */
    get encodeName(): boolean {
        return this.mappingScheme.$encodeName !== false;
    }

    /**
     * 格式化类型描述对象 | Format type scheme object
     * @param scheme 要进行格式化的原始类型描述对象 | Original type scheme object
     * @param schemeName 类型描述名称 | Scheme name
     * @returns 返回格式化后的类型描述对象 | Return formatted scheme object
     */
    private formatDataScheme(scheme: DataTypeScheme, schemeName: string): DataTypeScheme {
        // 设置默认名称 | Set default name if undefined
        scheme._schemeName = schemeName;

        // 如果描述对象的数据类型不是内置的 JSON 类型则获取自定义类型并和当前类型描述进行合并 | Merge mapping scheme if the data type scheme object is not a built-in JSON type
        if (!(scheme.type in JSONType) || schemeName !== scheme.type) {
            const sourceScheme = this.getDataScheme(scheme.type);
            if (!sourceScheme) {
                const error = new OptimizerError(`JSONOptimizer: The scheme type "${schemeName}" referenced in "${schemeName}" is not found.`);
                error.scheme = scheme;
                error.optimizer = this;
                throw error;
            }
            scheme = mergeScheme(scheme, sourceScheme);
        }

        // 从另一个类型描述对象继承属性定义 | Extend scheme properties from another scheme
        if (scheme.extend) {
            const extendedScheme = this.getDataScheme(scheme.extend);
            if (!extendedScheme) {
                const error = new OptimizerError(`JSONOptimizer: The scheme type "${scheme.extend}" extended in "${schemeName}" is not found.`);
                error.scheme = scheme;
                error.optimizer = this;
                throw error;
            }
            scheme = extendSchemeProps(scheme, extendedScheme);
        }

        // 尝试格式化特殊值映射 | Try to format scheme map
        if (scheme.map) {
            let mapForCompress: any;
            if (Array.isArray(scheme.map)) {
                mapForCompress = [];
                for (let i = 0; i < scheme.map.length; ++i) {
                    const mapValue = scheme.map[i];
                    if (typeof mapValue === 'object') {
                        mapForCompress.push(JSON.stringify(mapValue));
                    } else {
                        mapForCompress.push(mapValue);
                    }
                }
            } else {
                const map = scheme.map as SpecialValuesMapObject;
                mapForCompress = {};
                Object.keys(map).forEach(mapKey => {
                    const mapValue = (map as SpecialValuesMapObject)[mapKey];
                    if (typeof mapValue === 'object') {
                        mapForCompress[mapKey] = JSON.stringify(mapValue);
                    } else {
                        mapForCompress[mapKey] = mapValue;
                    }
                });
            }
            scheme._mapForEncode = mapForCompress as SpecialValuesMap;
        }

        // 格式化属性描述数组 | Format properties scheme array
        if (scheme.props && scheme.props.length) {
            for (let i = 0; i < scheme.props.length; ++i) {
                let propScheme = scheme.props[i];
                if (!propScheme.name) {
                    const error = new OptimizerError(`JSONOptimizer: One of scheme type "${scheme.extend}" 's properties name(index is ${i}) is undefined.`);
                    error.scheme = scheme;
                    error.optimizer = this;
                    throw error;
                }
                propScheme = this.formatDataScheme(propScheme, `${schemeName}.${propScheme.name}`) as DataPropertyTypeScheme;

                const propTypeScheme = this.getDataScheme(propScheme.type);
                propScheme = mergeScheme(propScheme, propTypeScheme) as DataPropertyTypeScheme;

                scheme.props[i] = propScheme;
            }
        }

        return scheme;
    }

    /**
     * 获取指定名称的类型描述对象 | Get data type scheme object by given name
     * @param name 数据类型名称 | Data type name
     * @param fallbackName 备用数据类型名称 | Fallback data type name
     * @returns 类型描述对象 | data type scheme object
     */
    getDataScheme(name: DataTypeName, fallbackName?: DataTypeName): DataTypeScheme {
        // 首先尝试从缓存中获取类型描述对象 | First try to get data type scheme object from cache
        let scheme = this.mappingSchemeCache[name];
        if (scheme) {
            return scheme;
        }

        // 获取映射表中的描述对象 | Get data type scheme object from data mapping scheme object
        scheme = this.mappingScheme[name] as DataTypeScheme;
        if (!scheme && fallbackName) {
            scheme = this.mappingScheme[fallbackName] as DataTypeScheme;
        }
        if (!scheme) {
            return null;
        }

        scheme = this.formatDataScheme(scheme, name);

        // 保存到缓存 | Save scheme to cache
        this.mappingSchemeCache[name] = scheme;
        return scheme;
    }

    /**
     * 根据名称索引获取类型描述名称 | Get type scheme name by index
     * @param index 类型名称索引 | Scheme type name index
     * @returns 类型名称 | Type scheme name
     */
    getSchemeNameByIndex(index: number): DataTypeName {
        if (!this.schemeNamesIndex) {
            this.schemeNamesIndex = Object.keys(this.mappingScheme).filter(x => !x.startsWith('$'));
            this.schemeNamesIndex.sort();
        }
        return this.schemeNamesIndex[index];
    }

    /**
     * 根据类型描述名称获取索引 | Get type scheme index by name
     * @param name 类型名称 | Scheme type name
     * @returns 类型名称索引 | Type scheme index
     */
    getSchemeIndexByName(name: DataTypeName): number {
        if (!this.schemeNamesIndexMap) {
            this.schemeNamesIndexMap = {};
            this.getSchemeNameByIndex(0);
            for (let i = 0; i < this.schemeNamesIndex.length; ++i) {
                this.schemeNamesIndexMap[this.schemeNamesIndex[i]] = i;
            }
        }
        return this.schemeNamesIndexMap[name];
    }

    /**
     * 使用类型描述对象对 JSON 数据进行编码操作 | Compress JSON data with data type scheme
     * @param scheme 类型描述对象 | Data type scheme
     * @param data 要编码的原始数据 | Original data to encode
     * @returns 返回编码后的数据 | Encoded data
     */
    private encodeWithScheme(scheme: DataTypeScheme, data: OriginalData): EncodedData {
        const value = data === undefined ? scheme.default : data;

        if (data instanceof Date) {
            const error = new OptimizerError(`Date type is not supported in scheme "${scheme._schemeName}".`);
            error.scheme = scheme;
            error.optimizer = this;
            error.originalData = data;
            error.encodeData = value;
            throw error;
        }

        // 尝试将原始值映射为特殊值 | Try to map original value to special value
        if (scheme.map) {
            const specialValueIndex = getSpecialValueIndex(scheme._mapForEncode, value);
            if (specialValueIndex !== undefined) {
                return specialValueIndex;
            }
        }

        // 对数据进行验证 | Validate required data
        if (this.validation) {
            const validationError = checkValidationError(scheme, value);
            if (validationError) {
                return validationError;
            }
        }

        if (value !== null && value !== undefined) {
            // 获取当前类型描述的最终内部类型 | Get final internal data type
            const type = JSONType[scheme.type as JSONTypeName];
            if (type === JSONType.object) {
                // 处理对象类型 | Process object type

                // 检查属性描述 | Check properties
                const {props} = scheme;
                if (!props || !props.length) {
                    const error = new OptimizerError(`JSONOptimizer: Properties scheme array is empty in data type scheme "${scheme._schemeName}".`);
                    error.scheme = scheme;
                    error.optimizer = this;
                    error.originalData = data;
                    error.encodeData = value;
                    throw error;
                }

                // 将对象属性转换为值数组
                const objectPropValues: EncodedData[] = [];

                // 保存最后一个不是默认值的属性索引
                let lastPropIndexWithoutDefaultValue = -1;
                for (let propIndex = 0; propIndex < props.length; ++propIndex) {
                    const propScheme = props[propIndex];
                    const propValue = value[propScheme.name];

                    if (this.omitDefaultProps && !isJSONDataEqual(propValue, propScheme.default)) {
                        lastPropIndexWithoutDefaultValue = propIndex;
                    }
                    const propEncodedValue = this.encodeWithScheme(propScheme, propValue);
                    objectPropValues.push(propEncodedValue);
                }

                if (this.omitDefaultProps) {
                    // 省略属性列表中后面全部为默认值的属性 | Skip properties value is empty at end
                    if (lastPropIndexWithoutDefaultValue > -1 && lastPropIndexWithoutDefaultValue < (props.length - 1)) {
                        objectPropValues.splice(lastPropIndexWithoutDefaultValue + 1, props.length - lastPropIndexWithoutDefaultValue - 1);
                    }
                }
                return objectPropValues;
            } if (type === JSONType.array && value.length) {
                // 处理数组类型 | Process array type

                const {arrType} = scheme;
                if (!arrType) {
                    const error = new OptimizerError(`JSONOptimizer: Array type name(arrType) cannot be empty in data type scheme "${scheme._schemeName}" which is array type.`);
                    error.scheme = scheme;
                    error.optimizer = this;
                    error.originalData = data;
                    error.encodeData = value;
                    throw error;
                }

                const arrayTypeScheme = this.getDataScheme(arrType);
                if (!arrayTypeScheme) {
                    const error = new OptimizerError(`JSONOptimizer: Array type scheme is not found in data type scheme "${scheme._schemeName}" which is array type.`);
                    error.scheme = scheme;
                    error.optimizer = this;
                    error.originalData = data;
                    error.encodeData = value;
                    throw error;
                }

                // 对数组中的值依次进行转换
                const arryValues: EncodedData[] = value.map((itemValue: OriginalData) => this.encodeWithScheme(arrayTypeScheme, itemValue));
                return arryValues;
            }
            const valueType = typeof value;
            if ((type === JSONType.string && valueType !== 'string') || (type === JSONType.number && valueType !== 'number') || (type === JSONType.boolean && valueType !== 'boolean')) {
                const error = new OptimizerError(`JSONOptimizer: Value actual type "${valueType}" is not match the type "${type}" of scheme "${scheme._schemeName}".`);
                error.scheme = scheme;
                error.optimizer = this;
                error.originalData = data;
                error.encodeData = value;
                throw error;
            }

            // Fixes Set.toJSON() === {} by casting the Set into an Array.
            if ((type === JSONType.array && valueType === 'object' && value instanceof Set)) {
                return Array.from(value);
            }
        }
        return value;
    }

    /**
     * 对编码后的数据进行还原为原始的 JSON 数据 | Decode data by given name
     * @param scheme 类型描述对象 | Data type scheme
     * @param data 要还原的原始数据 | Encoded data
     * @returns 返回还原后的数据 | Decoded data
     */
    private decodeWithScheme(scheme: DataTypeScheme, data: EncodedData): OriginalData {
        const value = data;

        if (value !== null && value !== undefined) {
            const valueType = typeof value;

            // 尝试将特殊值映射为原始值
            if (scheme.map && (valueType === 'string' || valueType === 'number')) {
                const specialValue = getSpecialValue(scheme.map, value);
                if (specialValue !== undefined) {
                    return specialValue;
                }
            }

            // 获取当前类型描述的最终内部类型 | Get final internal data type
            const type = JSONType[scheme.type as JSONTypeName];
            if (type === JSONType.object) {
                // 对象类型的编码数据必须为数组 | Encoded data type must be array for object scheme
                if (!Array.isArray(value)) {
                    const error = new OptimizerError(`JSONOptimizer: Encoded data is not an array with scheme "${scheme._schemeName}".`);
                    error.scheme = scheme;
                    error.optimizer = this;
                    error.encodedData = data;
                    throw error;
                }

                // 检查属性描述 | Check properties
                const {props} = scheme;
                if (!props || !props.length) {
                    const error = new OptimizerError(`JSONOptimizer: Properties scheme array is empty in data type scheme "${scheme._schemeName}".`);
                    error.scheme = scheme;
                    error.optimizer = this;
                    error.encodedData = data;
                    throw error;
                }

                const object: any = {};
                for (let i = 0; i < props.length; ++i) {
                    const prop = props[i];
                    let propValue;
                    if (i >= value.length) {
                        propValue = prop.default;
                    } else {
                        propValue = this.decodeWithScheme(prop, value[i]);
                    }
                    if (propValue !== undefined) {
                        object[prop.name] = propValue;
                    }
                }
                return object;
            } if (type === JSONType.array) {
                // 数组类型的编码数据必须为数组 | Encoded data type must be array for array scheme
                if (!Array.isArray(value)) {
                    const error = new OptimizerError(`JSONOptimizer: Encoded data is not an array with scheme "${scheme._schemeName}".`);
                    error.scheme = scheme;
                    error.optimizer = this;
                    error.encodedData = data;
                    throw error;
                }

                const {arrType} = scheme;
                if (!arrType) {
                    const error = new OptimizerError(`JSONOptimizer: Array type name(arrType) cannot be empty in data type scheme "${scheme._schemeName}" which is array type.`);
                    error.scheme = scheme;
                    error.optimizer = this;
                    error.encodedData = data;
                    throw error;
                }

                const arrayTypeScheme = this.getDataScheme(arrType);
                if (!arrayTypeScheme) {
                    const error = new OptimizerError(`JSONOptimizer: Array type scheme is not found in data type scheme "${scheme._schemeName}" which is array type.`);
                    error.scheme = scheme;
                    error.optimizer = this;
                    error.encodedData = data;
                    throw error;
                }

                return value.map(item => this.decodeWithScheme(arrayTypeScheme, item));
            } if (type === JSONType.boolean && valueType !== 'boolean') {
                if (DEBUG) {
                    console.warn(`JSONOptimizer: Encoded data type "${valueType}" not match the scheme "${scheme._schemeName}" type "${type}".`);
                }
                if (valueType === 'number') {
                    return value > 0;
                }
                if (valueType === 'string') {
                    const valueLowerCase = value.toLowerCase();
                    return valueLowerCase === '1' || valueLowerCase === 'true';
                }
                return scheme.default;
            } if (type === JSONType.number && valueType !== 'number') {
                if (DEBUG) {
                    console.warn(`JSONOptimizer: Encoded data type "${valueType}" not match the scheme "${scheme._schemeName}" type "${type}".`);
                }
                if (valueType === 'string') {
                    if (!value.length) {
                        return 0;
                    }
                    return Number.parseFloat(value);
                }
                return scheme.default;
            } if (type === JSONType.string && valueType !== 'string') {
                if (DEBUG) {
                    console.warn(`JSONOptimizer: Encoded data type "${valueType}" not match the scheme "${scheme._schemeName}" type "${type}".`);
                }
                return `${value}`;
            }
        }
        return value;
    }

    /**
     * 对 JSON 数据进行编码操作 | Compress JSON data by given name
     * @param name 要编码的数据类型名称 | Data type name
     * @param data 要编码的原始数据 | Original data to encode
     * @param fallbackName 备用数据类型名称 | Fallback data type name
     * @returns 返回编码后的数据 | Encoded data
     */
    encode(name: DataTypeName, data: OriginalData, fallbackName?: DataTypeName): EncodedData {
        const scheme = this.getDataScheme(name, fallbackName);
        if (!scheme) {
            const error = new OptimizerError(`JSONOptimizer: Scheme mapping object of data type "${name}" is not found.`);
            error.scheme = scheme;
            error.optimizer = this;
            error.originalData = data;
            throw error;
        }

        const encodedData = this.encodeWithScheme(scheme, data);
        if (this.encodeName) {
            // return [this.getSchemeIndexByName(name), encodedData];
            return [name, encodedData];
        }
        return encodedData;
    }

    /**
     * 对编码后的数据进行还原为原始的 JSON 数据 | Decode data by given name
     * @param name 要还原的数据类型名称 | Data type name
     * @param fallbackName 备用数据类型名称 | Fallback data type name
     * @param data 要还原的原始数据 | Encoded data
     * @returns 返回还原后的数据 | Decoded data
     */
    decode(data: EncodedData, name?: DataTypeName, fallbackName?: DataTypeName): OriginalData {
        if (this.encodeName) {
            if (!Array.isArray(data)) {
                const error = new OptimizerError('JSONOptimizer: Encoded data must be a array when use "encodeName" option.');
                error.optimizer = this;
                error.encodedData = data;
                throw error;
            }
            const nameInfo = data[0];
            if (typeof nameInfo === 'number') {
                name = this.getSchemeNameByIndex(nameInfo);
            } else {
                name = nameInfo;
            }
            data = data[1];
        }

        if (name == null) {
            const error = new OptimizerError('JSONOptimizer: Scheme name is null on decode data.');
            error.optimizer = this;
            error.encodedData = data;
            throw error;
        }

        const scheme = this.getDataScheme(name, fallbackName);
        if (!scheme) {
            const error = new OptimizerError(`JSONOptimizer: Scheme mapping object of data type "${name}" is no found.`);
            error.optimizer = this;
            error.encodedData = data;
            throw error;
        }
        return this.decodeWithScheme(scheme, data);
    }

    /**
     * 对原始数据进行编码操作并返回 JSON 字符串 | Compress data by given name to JSON string
     * @param name 要编码的数据类型名称 | Data type name
     * @param data 要编码的原始数据 | Original data to encode
     * @param fallbackName 备用数据类型名称 | Fallback data type name
     * @returns 返回编码后的 JSON 字符串 | Encoded data which  represented by JSON string
     */
    encodeToJSON(name: DataTypeName, data: OriginalData, fallbackName?: DataTypeName): string {
        return JSON.stringify(this.encode(name, data, fallbackName));
    }

    /**
     * 对编码后的 JSON 字符串进行还原操作并返回原始对象 | Decode data which represented by JSON string by given name
     * @param json 要还原的原始数据的 JSON 字符串形式 | Encoded data which represented by JSON string
     * @param name 要还原的数据类型名称 | Data type name
     * @param fallbackName 备用数据类型名称 | Fallback data type name
     * @returns 返回还原后的数据 | Decoded data
     */
    decodeFromJSON(json: string, name?: DataTypeName, fallbackName?: DataTypeName): OriginalData {
        return this.decode(JSON.parse(json), name, fallbackName);
    }
}
