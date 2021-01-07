package models

import "fmt"

type HttpStatusError struct {
	Verb       string
	Path       string
	Body       string
	StatusCode int
	Headers    map[string][]string
}

func (e HttpStatusError) Error() string {
	return fmt.Sprintf("HttpStatusCode error encountered while processing request to Genesys Cloud API. Verb %s, Path %s, Status Code %d, Body %v", e.Verb, e.Path, e.StatusCode, e.Body)
}