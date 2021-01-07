package retry

import (
	"gc/models"
	"net/http"
	"strconv"
	"time"
)

type RetryConfiguration struct {
	MaxRetryTimeSec          int
	MaxRetriesBeforeQuitting int
}

type retry struct {
	retryAfterMs             int64
	retryCountBeforeQuitting int
	RetryConfiguration
}

func RetryWithData(uri string, data string, httpCall func(uri string, data string) (string, error)) func(retryConfiguration *RetryConfiguration) (string, error) {
	return func(retryConfiguration *RetryConfiguration) (string, error) {
		if retryConfiguration == nil {
			retryConfiguration = &RetryConfiguration{
				MaxRetriesBeforeQuitting: 3,
				MaxRetryTimeSec: 10,
			}
		}
		retry := retry{
			RetryConfiguration: *retryConfiguration,
		}
		response, err := httpCall(uri, data)
		now := time.Now()
		for ok := true; ok; ok = retry.shouldRetry(now, err) {
			response, err = httpCall(uri, data)
		}
		return response, err
	}
}

func Retry(uri string, httpCall func(uri string) (string, error)) func(retryConfiguration *RetryConfiguration) (string, error) {
	return func(retryConfiguration *RetryConfiguration) (string, error) {
		if retryConfiguration == nil {
			retryConfiguration = &RetryConfiguration{
				MaxRetriesBeforeQuitting: 3,
				MaxRetryTimeSec: 10,
			}
		}
		retry := retry{
			RetryConfiguration: *retryConfiguration,
		}
		response, err := httpCall(uri)
		now := time.Now()
		for ok := true; ok; ok = retry.shouldRetry(now, err) {
			response, err = httpCall(uri)
		}
		return response, err
	}
}

func (r *retry) shouldRetry(startTime time.Time, errorValue error) bool {
	if errorValue == nil {
		return false
	}
	e := errorValue.(models.HttpStatusError)

	if time.Since(startTime) < secondsToNanoSeconds(r.MaxRetryTimeSec) && e.StatusCode == http.StatusTooManyRequests {
		r.retryAfterMs = getRetryAfterValue(e.Headers)
		r.retryCountBeforeQuitting++
		if r.retryCountBeforeQuitting < r.MaxRetriesBeforeQuitting {
			time.Sleep(milliSecondsToNanoSeconds(r.retryAfterMs))
			return true
		}
	}
	return false
}

func milliSecondsToNanoSeconds(milliSeconds int64) time.Duration {
	return time.Duration(milliSeconds * 1000 * 1000)
}

func secondsToNanoSeconds(seconds int) time.Duration {
	return milliSecondsToNanoSeconds(int64(seconds)) * 1000
}

func getRetryAfterValue(headers map[string][]string) int64 {
	defaultValue := int64(3000)
	retryAfterValues := headers["Retry-After"]
	if retryAfterValues == nil {
		return defaultValue
	}

	returnValue := int64(0)
	for _, retryAfter := range retryAfterValues {
		if retryAfter != "" {
			returnValue, _ = strconv.ParseInt(retryAfter, 10, 64)
			break
		}
	}

	// Edge case where the retry-after header has no value
	if returnValue == 0 {
		returnValue = defaultValue
	}

	return returnValue
}
