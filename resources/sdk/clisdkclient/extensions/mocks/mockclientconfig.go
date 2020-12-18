package mocks

import "fmt"

type MockClientConfig struct {
	ProfileNameFunc  func() string
	EnvironmentFunc  func() string
	ClientIDFunc     func() string
	ClientSecretFunc func() string
}

func (m *MockClientConfig) ProfileName() string {
	return m.ProfileNameFunc()
}

func (m *MockClientConfig) Environment() string {
	return m.EnvironmentFunc()
}

func (m *MockClientConfig) ClientID() string {
	return m.ClientIDFunc()
}

func (m *MockClientConfig) ClientSecret() string {
	return m.ClientSecretFunc()
}

func (m *MockClientConfig) String() string {
	return fmt.Sprintf("\n-------------\nProfile Name: %s\nEnvironment: %s\nClient ID: %s\nClient Secret: %s\n--------------\n", m.ProfileName(), m.Environment(), m.ClientID(), m.ClientSecret())
}
