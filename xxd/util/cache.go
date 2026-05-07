package util

import (
	"fmt"
	"time"

	"github.com/maypok86/otter"
)

// CacheConfig 缓存配置
type CacheConfig struct {
	UserTTL        time.Duration // 用户信息缓存时间
	ChatTTL        time.Duration // 会话信息缓存时间
	ChatMembersTTL time.Duration // 会话成员缓存时间
	MaxSize        int           // 缓存最大条目数
}

// DefaultCacheConfig 默认缓存配置
var DefaultCacheConfig = CacheConfig{
	UserTTL:        5 * time.Second, // 用户信息缓存5秒
	ChatTTL:        3 * time.Second, // 会话信息缓存3秒
	ChatMembersTTL: 5 * time.Second, // 会话成员缓存5秒
	MaxSize:        10000,           // 最多缓存10000条记录
}

// 全局缓存实例
var (
	// UserCache 用户信息缓存，key: userID (int64)
	UserCache otter.CacheWithVariableTTL[int64, any]

	// ChatCache 会话信息缓存，key: gid (string)
	ChatCache otter.CacheWithVariableTTL[string, any]

	// ChatMembersCache 会话成员缓存，key: gid (string), value: []int64
	ChatMembersCache otter.CacheWithVariableTTL[string, []int64]

	// CacheStats 缓存统计
	cacheInitialized bool
)

// InitCache 初始化缓存
func InitCache() error {
	if cacheInitialized {
		return nil
	}

	var err error

	// 初始化用户缓存
	UserCache, err = otter.MustBuilder[int64, any](DefaultCacheConfig.MaxSize).
		WithVariableTTL().
		Build()
	if err != nil {
		return fmt.Errorf("failed to create user cache: %v", err)
	}

	// 初始化会话缓存
	ChatCache, err = otter.MustBuilder[string, any](DefaultCacheConfig.MaxSize).
		WithVariableTTL().
		Build()
	if err != nil {
		return fmt.Errorf("failed to create chat cache: %v", err)
	}

	// 初始化会话成员缓存
	ChatMembersCache, err = otter.MustBuilder[string, []int64](DefaultCacheConfig.MaxSize).
		WithVariableTTL().
		Build()
	if err != nil {
		return fmt.Errorf("failed to create chat members cache: %v", err)
	}

	cacheInitialized = true
	Log("info", "[Cache] Cache initialized successfully")
	return nil
}

// GetUserFromCache 从缓存获取用户
func GetUserFromCache(userID int64) (any, bool) {
	if !cacheInitialized {
		return nil, false
	}
	return UserCache.Get(userID)
}

// SetUserToCache 设置用户缓存
func SetUserToCache(userID int64, user any) {
	if !cacheInitialized {
		return
	}
	UserCache.Set(userID, user, DefaultCacheConfig.UserTTL)
}

// InvalidateUserCache 失效用户缓存
func InvalidateUserCache(userID int64) {
	if !cacheInitialized {
		return
	}
	UserCache.Delete(userID)
}

// GetChatFromCache 从缓存获取会话
func GetChatFromCache(gid string) (any, bool) {
	if !cacheInitialized {
		return nil, false
	}
	return ChatCache.Get(gid)
}

// SetChatToCache 设置会话缓存
func SetChatToCache(gid string, chat any) {
	if !cacheInitialized {
		return
	}
	ChatCache.Set(gid, chat, DefaultCacheConfig.ChatTTL)
}

// InvalidateChatCache 失效会话缓存
func InvalidateChatCache(gid string) {
	if !cacheInitialized {
		return
	}
	ChatCache.Delete(gid)
}

// GetChatMembersFromCache 从缓存获取会话成员
func GetChatMembersFromCache(gid string) ([]int64, bool) {
	if !cacheInitialized {
		return nil, false
	}
	return ChatMembersCache.Get(gid)
}

// SetChatMembersToCache 设置会话成员缓存
func SetChatMembersToCache(gid string, members []int64) {
	if !cacheInitialized {
		return
	}
	// 复制一份避免外部修改
	membersCopy := make([]int64, len(members))
	copy(membersCopy, members)
	ChatMembersCache.Set(gid, membersCopy, DefaultCacheConfig.ChatMembersTTL)
}

// InvalidateChatMembersCache 失效会话成员缓存
func InvalidateChatMembersCache(gid string) {
	if !cacheInitialized {
		return
	}
	ChatMembersCache.Delete(gid)
}

// GetCacheStats 获取缓存统计信息
func GetCacheStats() map[string]any {
	if !cacheInitialized {
		return map[string]any{"initialized": false}
	}

	return map[string]any{
		"initialized": true,
		"user": map[string]any{
			"size": UserCache.Size(),
		},
		"chat": map[string]any{
			"size": ChatCache.Size(),
		},
		"chatMembers": map[string]any{
			"size": ChatMembersCache.Size(),
		},
	}
}

// CloseCache 关闭缓存
func CloseCache() {
	if !cacheInitialized {
		return
	}
	UserCache.Close()
	ChatCache.Close()
	ChatMembersCache.Close()
	cacheInitialized = false
	Log("info", "[Cache] Cache closed")
}
