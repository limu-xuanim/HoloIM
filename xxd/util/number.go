package util

func UniqueIntSlice(input []int64) []int64 {
	seen := make(map[int64]bool)
	result := []int64{}
	for _, value := range input {
		if _, exists := seen[value]; !exists {
			seen[value] = true
			result = append(result, value)
		}
	}
	return result
}

func Int64Intersect(a, b []int64) []int64 {
	// 优化：用较小的切片构建 map
	if len(b) > len(a) {
		a, b = b, a // 交换，确保 b 是较短的
	}

	bMap := make(map[int64]struct{}, len(b))
	for _, v := range b {
		bMap[v] = struct{}{}
	}

	// 预分配容量（最坏情况：a 全在 b 中）
	result := make([]int64, 0, len(a))
	for _, v := range a {
		if _, exists := bMap[v]; exists {
			result = append(result, v)
		}
	}
	return result
}

func Int64Diff(a, b []int64) []int64 {
	bMap := make(map[int64]struct{}, len(b))
	for _, v := range b {
		bMap[v] = struct{}{}
	}

	// 预分配容量（最坏情况：a 全不在 b 中）
	result := make([]int64, 0, len(a))
	for _, v := range a {
		if _, exists := bMap[v]; !exists {
			result = append(result, v)
		}
	}
	return result
}
