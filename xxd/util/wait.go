package util

import "sync"

const (
	CommonServeMuxWaitGroupID = "COMMON_SERVER_WAIT_GROUP"
)

var WaitGroups map[string]*sync.WaitGroup

func InitWait() {
	WaitGroups = make(map[string]*sync.WaitGroup)
}

func WaitGroupExists(id string) bool {
	_, ok := WaitGroups[id]
	return ok
}

func WaitGroupCreate(id string) error {
	if WaitGroupExists(id) {
		return Errorf("WaitGroup %s already exists", id)
	}
	WaitGroups[id] = &sync.WaitGroup{}
	return nil
}

func WaitGroupDelete(id string) error {
	if !WaitGroupExists(id) {
		return Errorf("WaitGroup %s does not exist", id)
	}
	delete(WaitGroups, id)
	return nil
}

func WaitGroupWait(id string) error {
	if !WaitGroupExists(id) {
		return Errorf("WaitGroup %s does not exist", id)
	}
	WaitGroups[id].Wait()
	return nil
}

func WaitGroupDone(id string) error {
	if !WaitGroupExists(id) {
		return Errorf("WaitGroup %s does not exist", id)
	}
	WaitGroups[id].Done()
	return nil
}

func WaitGroupAdd(id string, delta int) error {
	if !WaitGroupExists(id) {
		return Errorf("WaitGroup %s does not exist", id)
	}
	WaitGroups[id].Add(delta)
	return nil
}
