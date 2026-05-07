import compare from 'compare-versions';
import type {FeatureMinVersions} from '~/app/core/server/feature-versions';

/**
 * 格式化版本字符串
 * @param versionString 要格式化的版本字符串
 * @returns 格式化后的版本字符串
 * @example
 * formatVersion('3');          // → "3.0.0"
 * formatVersion('3.1');        // → "3.1.0"
 * formatVersion('3beta');      // → "3.0.0-beta"
 * formatVersion('3 beta');     // → "3.0.0-beta"
 * formatVersion('3-beta');     // → "3.0.0-beta"
 * formatVersion('3.1beta1');   // → "3.1.0-beta.1"
 * formatVersion('3.1 beta.1'); // → "3.1.0-beta.1"
 * formatVersion('3.1 beta1');  // → "3.1.0-beta.1"
 * formatVersion('3.1-beta1');  // → "3.1.0-beta.1"
 */
export function formatVersion(versionString: string): string {
    return versionString.replace(
        /^([0-9]+)((?:\.[0-9]+)?)((?:\.[0-9]+)?)(?:[.\s-+]?)((?:[A-Za-z]+)?)((?:\.?[0-9]+)?)/gi,
        (_: string, major: string, minor: string, patch: string, preRelease: string, build: string): string => {
            const versionStrings = [
                major,
                minor || '.0',
                patch || '.0',
            ];
            if (preRelease || build) {
                versionStrings.push('-');
            }
            if (preRelease) {
                versionStrings.push(preRelease);
            }
            if (build) {
                if (!preRelease) {
                    versionStrings.push('build');
                }
                if (build[0] !== '.') {
                    versionStrings.push('.');
                }
                versionStrings.push(build);
            }
            return versionStrings.join('');
        }
    );
}

/**
 * 简化版本字符串
 * @param versionString 要简化的版本字符串
 * @returns 简化后的版本字符串
 * @example
 * simplifyVersion('3.0.0');        // → "3.0"
 * simplifyVersion('3.0.1');        // → "3.0.1"
 * simplifyVersion('3.0.0-beta');   // → "3.0-beta"
 * simplifyVersion('3.1.0-beta.1'); // → "3.1 beta1"
 */
export const simplifyVersion = (versionString: string): string => versionString.replace(/^([0-9]+)((?:\.[0-9]+)?)((?:\.[0-9]+)?)(?:[.\s-+]?)((?:[A-Za-z]+)?)((?:\.?[0-9]+)?)/gi, (_: string, major: string, minor: string, patch: string, preRelease: string, build: string): string => {
    const versionStrings = [
        major,
        minor || '.0',
    ];
    if (patch && patch !== '.0' && patch !== '0') {
        versionStrings.push(patch);
    }
    if (preRelease || build) {
        versionStrings.push('.');
    }
    if (preRelease) {
        versionStrings.push(preRelease);
    }
    if (build) {
        if (!preRelease) {
            versionStrings.push('build');
        }
        versionStrings.push(build[0] === '.' ? build.substr(1) : build);
    }
    return versionStrings.join('');
});

/**
 * 比较两个版本字符串
 * @param version1 版本字符串1
 * @param version2 版本字符串2
 * @returns 如果版本相等返回 `0`，如果 [version1] 比 [version2] 新则返回 `1`，否则返回 `-1`
 */
export const compareVersions = (version1: string, version2: FeatureMinVersions | string): number => compare(formatVersion(version1), formatVersion(version2));

export default {
    compareVersions,
    formatVersion,
    simplifyVersion
};
