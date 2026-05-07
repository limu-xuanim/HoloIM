package backend

// This file provides non-ee redirect compatibility hooks for license-related
// paths. New business code should not depend on these helpers directly.

func licenseEffectiveState() (int, bool) {
	return 0, false
}

func classifyLicensePath(path string) string {
	return PathTypeOther
}

func mergeLicenseRedirectRules(rules map[int]map[string]string) {}
