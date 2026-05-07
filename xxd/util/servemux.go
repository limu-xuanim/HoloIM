package util

import (
	"crypto/tls"
	"net"
	"net/http"
)

const (
	CommonServeMuxID = "COMMON_SERVER"
)

var ServeMuxes map[string]*http.ServeMux

func InitServeMux() {
	ServeMuxes = make(map[string]*http.ServeMux)
}

func serveMuxExists(id string) bool {
	_, ok := ServeMuxes[id]
	return ok
}

func ServeMuxGet(id string) (*http.ServeMux, error) {
	if !serveMuxExists(id) {
		return nil, Errorf("ServeMux %s does not exist", id)
	}
	return ServeMuxes[id], nil
}

func ServeMuxCreate(id string) (*http.ServeMux, error) {
	if serveMuxExists(id) {
		return nil, Errorf("ServeMux %s already exists", id)
	}
	ServeMuxes[id] = http.NewServeMux()
	return ServeMuxes[id], nil
}

func ServeMuxHandle(id, pattern string, handler http.Handler) error {
	if !serveMuxExists(id) {
		return Errorf("ServeMux %s does not exist", id)
	}
	ServeMuxes[id].Handle(pattern, handler)
	return nil
}

func ServeMuxHandleFunc(id, pattern string, handler func(http.ResponseWriter, *http.Request)) error {
	if !serveMuxExists(id) {
		return Errorf("ServeMux %s does not exist", id)
	}
	ServeMuxes[id].HandleFunc(pattern, handler)
	return nil
}

func ServeMuxServeHTTP(id string, w http.ResponseWriter, r *http.Request) error {
	if !serveMuxExists(id) {
		return Errorf("ServeMux %s does not exist", id)
	}
	ServeMuxes[id].ServeHTTP(w, r)
	return nil
}

func ServeMuxServe(id, addr string) error {
	if !serveMuxExists(id) {
		return Errorf("ServeMux %s does not exist", id)
	}
	return http.ListenAndServe(addr, ServeMuxes[id])
}

func ServeMuxServeTLS(id, addr, certFile, keyFile string) error {
	if !serveMuxExists(id) {
		return Errorf("ServeMux %s does not exist", id)
	}
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return err
	}
	cfg := SecureServerTLSConfig()
	cfg.Certificates = []tls.Certificate{cert}
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	defer listener.Close()
	return http.Serve(tls.NewListener(listener, cfg), ServeMuxes[id])
}
