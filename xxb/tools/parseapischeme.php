<?php
/**
 * Apischeme parser.
 *
 * @param  string    $schemeFile
 * @access public
 * @return string
 */
function parseApiScheme($schemeFile)
{
    $content = file_get_contents($schemeFile);
    $json    = json_decode($content);

    $blacklistedTypes = array('date', 'sysserverstartRequest', 'sysserverstartResponse', 'syssessionidRequest', 'syssessionidResponse', 'userkickoffResponse', 'syncusersRequest', 'chattypingRequest', 'chattypingResponse', 'datatransferRequest', 'syserrorResponse', 'pingRequest', 'pingResponse');

    $codes = "<?" . 'php' . "\n";
    foreach($json as $key => $value)
    {
        /* Skip unused types. */
        if(in_array($key, $blacklistedTypes)) continue;

        if(isset($value->type) and ($value->type == 'array'))
        {
            $codes .= "\$config->maps['$key'] = array('name' => '{$key}', 'type' => 'list', 'dataType' => &\$config->maps['{$value->arrType}']);\n";
            continue;
        }

        if(isset($value->extend))
        {
            $codes .= "\$config->maps['$key'] = \$config->maps['{$value->extend}'];\n";
        }
        elseif(isset($value->type) and isset($json->{$value->type}))
        {
            $type = $json->{$value->type}->type;
            $codes .= "\$config->maps['$key'] = \$config->maps['{$value->type}'];\n";
            $codes .= "\$config->maps['$key']['name'] = '{$key}';\n";
        }
        elseif(isset($value->map))
        {
            $arrStr = "'" . implode("','", $value->map) . "'";
            $codes .= "\$config->maps['$key'] = array('name' => '$key', 'type' => 'basic', 'options' => array($arrStr), 'dataType' => array());\n";
        }
        elseif(is_string($value))
        {
            $codes .= "\$config->maps['$key'] = '$value';\n";
        }
        else
        {
            $codes .= "\$config->maps['$key'] = array('type' => 'object', 'name' => '$key');\n";
        }

        if(isset($value->props))
        {
            foreach ($value->props as $prop)
            {
                $overrideIndex  = 4;
                $overrideData   = false;
                $overrideParams = false;

                if(isset($value->extend))
                {
                    if($value->extend == 'responsePack' and $prop->name == 'data') $overrideData = true;
                    if($value->extend == 'requestPack' and $prop->name == 'params') $overrideParams = true;
                }

                $indexString = ($overrideParams or $overrideData) ? "[$overrideIndex]" : "[]";

                if(isset($json->{$prop->type}) and !in_array($prop->type, $blacklistedTypes))
                {
                    $typeString     = isset($json->{$prop->type}->type) ? "\$config->maps['{$prop->type}']['type']" : "'object'";
                    $dataTypeString = "&\$config->maps['{$prop->type}']['dataType']";
                    $optionsString  = isset($json->{$prop->type}->map) ? "'options' => \$config->maps['{$prop->type}']['options'], " : "";
                    $codes .= "\$config->maps['$key']['dataType']$indexString = array('name' => '{$prop->name}', 'type' => $typeString, $optionsString'dataType' => $dataTypeString);\n";
                }
                elseif(isset($prop->map))
                {
                    $arrStr = "'" . implode("','", $prop->map) . "'";
                    $codes .= "\$config->maps['$key']['dataType']$indexString = array('name' => '{$prop->name}', 'type' => 'basic', 'options' => array($arrStr));\n";
                }
                elseif($prop->type != 'array')
                {
                    $codes .= "\$config->maps['$key']['dataType']$indexString = array('name' => '{$prop->name}', 'type' => 'basic');\n";
                }
                elseif(isset($json->{$prop->arrType}))
                {
                    $codes .= "\$config->maps['$key']['dataType']$indexString = array('name' => '{$prop->name}', 'type' => 'list', 'dataType' => &\$config->maps['$prop->arrType']);\n";
                }
                else
                {
                    $codes .= "\$config->maps['$key']['dataType']$indexString = array('name' => '{$prop->name}', 'type' => 'basic');\n";
                }
            }
        }
    }
    return $codes;
}

/* If apischeme file posted parse the file.*/
if(isset($argv[1]) and is_file($argv[1])) echo parseApiScheme($argv[1]);
