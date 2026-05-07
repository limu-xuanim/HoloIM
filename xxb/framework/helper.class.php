<?php
/**
 * Helper类从baseHelper类继承而来，您可以在这个文件中对其进行扩展。
 * This helper class extends from the baseHelper class, and you can
 * extend it by change this helper.class.php file.
 *
 * @package framework
 *
 * The author disclaims copyright to this source code. In place of
 * a legal notice, here is a blessing:
 *
 *  May you do good and not evil.
 *  May you find forgiveness for yourself and forgive others.
 *  May you share freely, never taking more than you give.
 */
include dirname(__FILE__) . '/base/helper.class.php';
class helper extends baseHelper
{
    /**
     * Merge config items in database and config files.
     *
     * @param  array  $dbConfig
     * @param  string $moduleName
     * @static
     * @access public
     * @return void
     */
    public static function mergeConfig($dbConfig, $moduleName = 'common')
    {
        global $config;

        $config2Merge = $config;
        if($moduleName != 'common') $config2Merge = $config->$moduleName;

        foreach($dbConfig as $item)
        {
            foreach($item as $record)
            {
                if(!is_object($record))
                {
                    $config2Merge->{$item->key} = $item->value;
                    break;
                }

                if(!isset($config2Merge->{$record->section})) $config2Merge->{$record->section} = new stdclass();
                if($record->key) $config2Merge->{$record->section}->{$record->key} = $record->value;
            }
        }
    }

    /**
     * Encode json for $.parseJSON
     *
     * @param  array  $data
     * @param  int    $options
     * @static
     * @access public
     * @return string
     */
    static public function jsonEncode4Parse($data, $options = 0)
    {
        $json = json_encode($data);
        if($options) $json = str_replace(array("'", '"'), array('\u0027', '\u0022'), $json);

        $escapers     = array("\\",  "/",   "\"", "'", "\n",  "\r",  "\t", "\x08", "\x0c", "\\\\u");
        $replacements = array("\\\\", "\\/", "\\\"", "\'", "\\n", "\\r", "\\t",  "\\f",  "\\b", "\\u");
        return str_replace($escapers, $replacements, $json);
    }

    /**
     * Unify string to standard chars.
     *
     * @param  string    $string
     * @param  string    $to
     * @static
     * @access public
     * @return string
     */
    public static function unify($string, $to = ',')
    {
        $labels = array('_', '、', ' ', '-', '?', '@', '&', '%', '~', '`', '+', '*', '/', '\\', '，', '。');
        $string = str_replace($labels, $to, $string);
        return preg_replace("/[{$to}]+/", $to, trim($string, $to));
    }

    /**
     * Format version to semver formate.
     *
     * @param  string    $version
     * @static
     * @access public
     * @return string
     */
    public static function formatVersion($version)
    {
        return preg_replace_callback(
            '/([0-9]+)((?:\.[0-9]+)?)((?:\.[0-9]+)?)(?:[\s\-\+\.]?)((?:[a-z]+)?)((?:\.?[0-9]+)?)/i',
            function($matches)
            {
                $major      = $matches[1];
                $minor      = $matches[2];
                $patch      = $matches[3];
                $preRelease = $matches[4];
                $build      = $matches[5];

                $versionStrs = array(
                    $major,
                    $minor ?: ".0",
                    $patch ?: ".0",
                );

                if($preRelease ?: $build) array_push($versionStrs, "-");
                if($preRelease) array_push($versionStrs, $preRelease);
                if($build)
                {
                    if(!$preRelease) array_push($versionStrs, "build");
                    if(mb_substr($build, 0, 1) !== ".") array_push($versionStrs, ".");

                    array_push($versionStrs, $build);
                }
                return join("", $versionStrs);
            },
            $version
        );
    }

	/**
	 * Trim version to xuanxuan version format.
	 *
	 * @param  string    $version
	 * @access public
	 * @return string
	 */
	public function trimVersion($version)
	{
		return preg_replace_callback(
			'/([0-9]+)((?:\.[0-9]+)?)((?:\.[0-9]+)?)(?:[\s\-\+]?)((?:[a-z]+)?)((?:\.?[0-9]+)?)/i',
			function($matches)
			{
				$major      = $matches[1];
				$minor      = $matches[2];
				$patch      = $matches[3];
				$preRelease = $matches[4];
				$build      = $matches[5];

				$versionStrs = array(
					$major,
					$minor ?: ".0",
				);

				if($patch && $patch !== ".0" && $patch !== "0") array_push($versionStrs, $patch);
				if($preRelease ?: $build) array_push($versionStrs, " ");
				if($preRelease) array_push($versionStrs, $preRelease);
				if($build)
				{
					if(!$preRelease) array_push($versionStrs, "build");
					array_push($versionStrs, mb_substr($build, 0, 1) === "." ? substr($build, 1) : $build);
				}
				return join("", $versionStrs);
			},
			$version
		);
	}
}

/**
 * Check exist onlybody param.
 *
 * @access public
 * @return void
 */
function isonlybody()
{
    return (isset($_GET['onlybody']) and $_GET['onlybody'] == 'yes');
}

/**
 * Format time.
 *
 * @param  int    $time
 * @param  string $format
 * @access public
 * @return void
 */
function formatTime($time, $format = '')
{
    $time = str_replace('0000-00-00', '', $time);
    $time = str_replace('00:00:00', '', $time);
    if(trim($time) == '') return ;
    if($format) return date($format, strtotime($time));
    return trim($time);
}
