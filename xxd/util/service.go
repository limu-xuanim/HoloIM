/**
 * Provide access to service related functions and variables of util module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     util
 * @link        https://www.xuanim.com
 */
package util

import (
	"github.com/kardianos/service"
)

// Interactive tells if program is running as a service or not.
func Interactive() bool {
	return service.Interactive()
}
