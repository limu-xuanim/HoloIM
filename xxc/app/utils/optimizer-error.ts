import JSONOptimizer, {DataTypeScheme} from './json-optimizer';

export default class OptimizerError extends Error {
    scheme: DataTypeScheme;

    originalData: any;

    encodedData: any;

    decodedData: any;

    encodeData: any;

    decodeData: any;

    optimizer: JSONOptimizer;
}
