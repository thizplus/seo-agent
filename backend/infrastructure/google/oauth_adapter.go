package google

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"seo-agents-backend/domain/ports"
)

// OAuthAdapter — Google OAuth implementation ของ GoogleOAuthPort
type OAuthAdapter struct {
	clientID     string
	clientSecret string
}

func NewOAuthAdapter(clientID, clientSecret string) *OAuthAdapter {
	return &OAuthAdapter{clientID: clientID, clientSecret: clientSecret}
}

func (a *OAuthAdapter) GetAuthURL(state, redirectURI, scope string) string {
	params := url.Values{}
	params.Add("client_id", a.clientID)
	params.Add("redirect_uri", redirectURI)
	params.Add("response_type", "code")
	params.Add("scope", scope)
	params.Add("access_type", "offline")
	params.Add("prompt", "consent")
	params.Add("state", state)
	return fmt.Sprintf("https://accounts.google.com/o/oauth2/v2/auth?%s", params.Encode())
}

func (a *OAuthAdapter) ExchangeCode(code, redirectURI string) (*ports.TokenResponse, error) {
	data := url.Values{}
	data.Set("client_id", a.clientID)
	data.Set("client_secret", a.clientSecret)
	data.Set("code", code)
	data.Set("grant_type", "authorization_code")
	data.Set("redirect_uri", redirectURI)

	resp, err := http.PostForm("https://oauth2.googleapis.com/token", data)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"`
		Error        string `json:"error"`
		ErrorDesc    string `json:"error_description"`
	}
	json.Unmarshal(body, &result)

	if result.Error != "" {
		return nil, fmt.Errorf("Google OAuth error: %s — %s", result.Error, result.ErrorDesc)
	}
	if result.AccessToken == "" {
		return nil, fmt.Errorf("no access token received from Google")
	}

	return &ports.TokenResponse{
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
		ExpiresIn:    result.ExpiresIn,
	}, nil
}

func (a *OAuthAdapter) RefreshAccessToken(refreshToken string) (string, error) {
	data := url.Values{}
	data.Set("client_id", a.clientID)
	data.Set("client_secret", a.clientSecret)
	data.Set("refresh_token", refreshToken)
	data.Set("grant_type", "refresh_token")

	resp, err := http.PostForm("https://oauth2.googleapis.com/token", data)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	if result.AccessToken == "" {
		return "", fmt.Errorf("no access token received")
	}
	return result.AccessToken, nil
}

func (a *OAuthAdapter) GetUserInfo(accessToken string) (*ports.GoogleUserInfo, error) {
	req, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var info struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	json.Unmarshal(body, &info)

	return &ports.GoogleUserInfo{
		ID: info.ID, Email: info.Email, Name: info.Name, Picture: info.Picture,
	}, nil
}

func (a *OAuthAdapter) FetchGSCProperties(accessToken string) ([]ports.GSCProperty, error) {
	req, _ := http.NewRequest("GET", "https://www.googleapis.com/webmasters/v3/sites", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		SiteEntry []struct {
			SiteURL         string `json:"siteUrl"`
			PermissionLevel string `json:"permissionLevel"`
		} `json:"siteEntry"`
	}
	json.Unmarshal(body, &result)

	props := make([]ports.GSCProperty, 0, len(result.SiteEntry))
	for _, e := range result.SiteEntry {
		props = append(props, ports.GSCProperty{SiteURL: e.SiteURL, Permission: e.PermissionLevel})
	}
	return props, nil
}
