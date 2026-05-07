package user

import "xxd/api"

func (s *LoginService) appendConferenceInviteResponses(responseList []api.XxbResponse, xxbResponse api.XxbResponse, userID int64) ([]api.XxbResponse, error) {
	return responseList, nil
}

func (s *LoginOutService) closeConference(xxbResponse api.XxbResponse, userID int64) []api.XxbResponse {
	return []api.XxbResponse{}
}
