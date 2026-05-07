package im

import (
	"fmt"
	"xxd/model"
)

func (i *ImService) GetUser(userId int64) (*model.User, error) {
	userModel := &model.User{}
	users, err := userModel.GetListByStatus(i.db, "", []int64{userId})
	if err != nil {
		return nil, err
	}

	if len(users) == 0 {
		return nil, fmt.Errorf("No such user.")
	}

	return &users[0], err
}

func (i *ImService) GetUserByAccount(account string) (model.User, error) {
	user := &model.User{}
	return user.GetUserByAccount(i.db, account)
}
