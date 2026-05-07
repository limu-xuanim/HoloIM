package util

import (
	"encoding/gob"
	"net/http"
	"net/url"

	"github.com/gorilla/sessions"
)

var store *sessions.CookieStore

// SessionSetup sets up the session store
func SessionSetup() {
	// skip if store is already setup
	if store != nil {
		return
	}

	gob.Register(url.Values{})

	store = sessions.NewCookieStore([]byte(Config.OIDC.SessionSecretKey))
	store.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   int(Config.OIDC.SessionMaxAge),
		HttpOnly: true,
	}
}

// SessionGet gets value stored within a established session by name
func SessionGet(r *http.Request, name string) (value any, err error) {
	session, err := store.Get(r, Config.OIDC.SessionName)
	if err != nil {
		return
	}

	value = session.Values[name]

	return
}

// SessionSet sets value into a established session by name
func SessionSet(w http.ResponseWriter, r *http.Request, name string, value any) (err error) {
	session, err := store.Get(r, Config.OIDC.SessionName)
	if err != nil {
		return
	}

	session.Values[name] = value
	err = session.Save(r, w)

	return
}

// SessionDelete deletes a value from session by name
func SessionDelete(w http.ResponseWriter, r *http.Request, name string) (err error) {
	session, err := store.Get(r, Config.OIDC.SessionName)
	if err != nil {
		return
	}

	delete(session.Values, name)
	err = session.Save(r, w)

	return
}
