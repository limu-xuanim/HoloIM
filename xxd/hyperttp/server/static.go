package server

import (
	"embed"
	"net/http"
	"os"
)

const StaticRoot = "/static/"

//go:embed static/*
var Static embed.FS

// NoListingFileSystem is a http.FileSystem that does not allow listing directories
type NoListingFileSystem struct {
	FS http.FileSystem
}

// Open opens a file
func (fs NoListingFileSystem) Open(name string) (http.File, error) {
	f, err := fs.FS.Open(name)
	if err != nil {
		return nil, err
	}
	return noListingFile{f}, nil
}

// noListingFile is a http.File that does not allow Readdir
type noListingFile struct {
	http.File
}

// Readdir returns nil
func (f noListingFile) Readdir(count int) ([]os.FileInfo, error) {
	return nil, nil
}

// getStaticHandler returns a new http.Handler as static file server
func getStaticHandler() http.Handler {
	return http.FileServer(NoListingFileSystem{http.FS(Static)})
}
